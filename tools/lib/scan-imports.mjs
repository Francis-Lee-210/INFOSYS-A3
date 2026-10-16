// Lexical extraction of literal ESM import/export references from valid
// JavaScript source. The scanner does not validate the full grammar or resolve
// module URLs; callers resolve and contain every returned specifier.

const ID_START = /[$_\p{ID_Start}]/u;
const ID_CONTINUE = /[$_\u200c\u200d\p{ID_Continue}]/u;
const SPACE = /\s/u;
const HEX = /^[\da-f]+$/i;
const LINE_END = /[\n\r\u2028\u2029]/u;
const CONTROL = new Set(['if', 'for', 'while', 'with', 'switch', 'catch']);
const PREFIX = new Set(['return', 'throw', 'case', 'delete', 'void', 'typeof', 'new', 'in', 'instanceof', 'yield', 'await']);
const BLOCK_LEAD = new Set(['else', 'do', 'try', 'finally', 'catch']);
const OPERATORS = ['>>>=', '===', '!==', '**=', '&&=', '||=', '??=', '>>>', '<<=', '>>=', '...', '=>', '==', '!=', '<=', '>=', '++', '--', '&&', '||', '??', '?.', '**', '<<', '>>', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^='];

function errorAt(message, position) {
  return new SyntaxError(`${message} at source offset ${position}`);
}
function pointAt(source, position) {
  return position < source.length ? String.fromCodePoint(source.codePointAt(position)) : '';
}
function skipTrivia(source, start) {
  let i = start;
  let newline = false;
  while (i < source.length) {
    const c = source[i];
    if (SPACE.test(c)) { newline ||= LINE_END.test(c); i++; continue; }
    if (source.startsWith('//', i) || (i === 0 && source.startsWith('#!', i))) {
      i += 2;
      while (i < source.length && !LINE_END.test(source[i])) i++;
      continue;
    }
    if (source.startsWith('/*', i)) {
      const end = source.indexOf('*/', i + 2);
      if (end < 0) throw errorAt('Unterminated comment', i);
      newline ||= LINE_END.test(source.slice(i + 2, end));
      i = end + 2;
      continue;
    }
    break;
  }
  return { end: i, newline };
}
function readUnicodeEscape(source, start) {
  if (source[start] !== '\\' || source[start + 1] !== 'u') throw errorAt('Invalid Unicode escape', start);
  if (source[start + 2] === '{') {
    const end = source.indexOf('}', start + 3);
    const digits = end < 0 ? '' : source.slice(start + 3, end);
    if (!digits || !HEX.test(digits)) throw errorAt('Invalid Unicode escape', start);
    const value = Number.parseInt(digits, 16);
    if (value > 0x10ffff) throw errorAt('Unicode escape out of range', start);
    return { value: String.fromCodePoint(value), end: end + 1 };
  }
  const digits = source.slice(start + 2, start + 6);
  if (digits.length !== 4 || !HEX.test(digits)) throw errorAt('Invalid Unicode escape', start);
  return { value: String.fromCharCode(Number.parseInt(digits, 16)), end: start + 6 };
}
function readIdentifier(source, start, privateName = false) {
  let i = start + Number(privateName);
  let value = privateName ? '#' : '';
  let escaped = false;
  let first = true;
  while (i < source.length) {
    const part = source[i] === '\\' ? readUnicodeEscape(source, i) : { value: pointAt(source, i), end: i + pointAt(source, i).length };
    if (!(first ? ID_START : ID_CONTINUE).test(part.value)) break;
    escaped ||= source[i] === '\\';
    value += part.value;
    i = part.end;
    first = false;
  }
  if (first) throw errorAt('Invalid identifier', start);
  return { type: privateName ? 'private' : 'name', value, escaped, start, end: i };
}
function readString(source, start) {
  const quote = source[start];
  let value = '';
  let i = start + 1;
  while (i < source.length) {
    const c = source[i++];
    if (c === quote) return { type: 'string', value, start, end: i };
    if (c === '\n' || c === '\r') throw errorAt('Unescaped string newline', i - 1);
    if (c !== '\\') { value += c; continue; }
    if (i >= source.length) break;
    const escape = source[i++];
    if (LINE_END.test(escape)) {
      if (escape === '\r' && source[i] === '\n') i++;
      continue;
    }
    const short = { b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v' };
    if (Object.hasOwn(short, escape)) { value += short[escape]; continue; }
    if (escape === 'x') {
      const digits = source.slice(i, i + 2);
      if (digits.length !== 2 || !HEX.test(digits)) throw errorAt('Invalid hexadecimal escape', i - 2);
      value += String.fromCharCode(Number.parseInt(digits, 16)); i += 2; continue;
    }
    if (escape === 'u') {
      const decoded = readUnicodeEscape(source, i - 2);
      value += decoded.value; i = decoded.end; continue;
    }
    if (escape === '0' && !/[0-9]/.test(source[i] || '')) { value += '\0'; continue; }
    if (/[0-9]/.test(escape)) throw errorAt('Legacy numeric escape in module string', i - 2);
    value += escape;
  }
  throw errorAt('Unterminated string', start);
}
function readRegex(source, start) {
  let i = start + 1;
  let characterClass = false;
  while (i < source.length) {
    const c = source[i++];
    if (LINE_END.test(c)) throw errorAt('Unterminated regular expression', start);
    if (c === '\\') {
      if (i >= source.length || LINE_END.test(source[i])) throw errorAt('Unterminated regular expression', start);
      i += pointAt(source, i).length; continue;
    }
    if (c === '[') characterClass = true;
    else if (c === ']') characterClass = false;
    else if (c === '/' && !characterClass) {
      while (ID_CONTINUE.test(pointAt(source, i)) && i < source.length) i += pointAt(source, i).length;
      return { type: 'regex', value: '', start, end: i };
    }
  }
  throw errorAt('Unterminated regular expression', start);
}
function readSimpleToken(source, start) {
  const i = skipTrivia(source, start).end;
  if (i >= source.length) return { type: 'end', value: '', start: i, end: i };
  if (source[i] === '"' || source[i] === "'") return readString(source, i);
  if (ID_START.test(pointAt(source, i)) || source[i] === '\\') return readIdentifier(source, i);
  return { type: 'punct', value: source[i], start: i, end: i + 1 };
}
// Only the small static module-clause grammar is consumed here. Bodies of export
// declarations remain in the code scanner, so nested import() is still visited.
function finishStaticReference(source, token) {
  const reference = token.value;
  let end = token.end;
  let next = readSimpleToken(source, end);
  if (next.type === 'name' && next.value === 'with') {
    next = readSimpleToken(source, next.end);
    if (next.value === '{') {
      do {
        next = readSimpleToken(source, next.end);
        if (next.type === 'end') throw errorAt('Unterminated import attributes', end);
      } while (next.type !== 'punct' || next.value !== '}');
      end = next.end;
    }
  }
  return { end, reference };
}
function readStaticClause(source, start, kind) {
  let token = readSimpleToken(source, start);
  if (kind === 'import' && token.type === 'string') return finishStaticReference(source, token);
  if (kind === 'import' && token.type === 'name') {
    token = readSimpleToken(source, token.end);
    if (token.value === ',') token = readSimpleToken(source, token.end);
  }
  if (token.value === '{') {
    do {
      token = readSimpleToken(source, token.end);
      if (token.type === 'end') throw errorAt('Unterminated module clause', start);
    } while (token.value !== '}' || token.type !== 'punct');
    const end = token.end;
    token = readSimpleToken(source, end);
    if (kind === 'export' && token.value !== 'from') return { end };
  } else if (token.value === '*') {
    token = readSimpleToken(source, token.end);
    if (token.value === 'as') {
      token = readSimpleToken(source, token.end);
      token = readSimpleToken(source, token.end);
    }
  }
  if (token.type !== 'name' || token.value !== 'from') return null;
  token = readSimpleToken(source, token.end);
  if (token.type !== 'string') return null;
  return finishStaticReference(source, token);
}

export function collectModuleReferences(source) {
  if (typeof source !== 'string') throw new TypeError('source must be a string');
  const references = [];
  let offset = 0;

  function literalArgument(start) {
    let token = readSimpleToken(source, start);
    let grouping = 0;
    while (token.value === '(') { grouping++; token = readSimpleToken(source, token.end); }
    if (token.type !== 'string') return;
    const reference = token.value;
    token = readSimpleToken(source, token.end);
    while (grouping > 0 && token.value === ')') { grouping--; token = readSimpleToken(source, token.end); }
    if (grouping === 0 && (token.value === ')' || token.value === ',')) references.push(reference);
  }

  function template() {
    const start = offset++;
    while (offset < source.length) {
      const c = source[offset++];
      if (c === '`') return { type: 'template', value: '', start, end: offset };
      if (c === '\\') {
        if (source[offset] === '\r' && source[offset + 1] === '\n') offset += 2;
        else if (offset < source.length) offset += pointAt(source, offset).length;
      } else if (c === '$' && source[offset] === '{') {
        offset++;
        code(true);
      }
    }
    throw errorAt('Unterminated template', start);
  }

  function code(templateExpression = false) {
    const contexts = [{ kind: templateExpression ? 'template-root' : 'statements', conditional: 0 }];
    let expressionAllowed = true;
    let statementStart = !templateExpression;
    let previous;
    let restricted;
    const top = () => contexts[contexts.length - 1];
    const isStatements = (context) => ['statements', 'block', 'function-body', 'method-body', 'arrow-body'].includes(context.kind);
    const isMembers = (context) => context.kind === 'object' || context.kind === 'class-body';

    while (offset < source.length) {
      const trivia = skipTrivia(source, offset);
      offset = trivia.end;
      if (offset >= source.length) break;
      if (trivia.newline && restricted) {
        expressionAllowed = true;
        statementStart = true;
        restricted = undefined;
      }
      if (templateExpression && source[offset] === '}' && contexts.length === 1) { offset++; return; }
      const start = offset;
      const c = source[offset];
      let token;
      if (c === '"' || c === "'") token = readString(source, offset);
      else if (c === '`') token = template();
      else if (c === '/' && expressionAllowed) token = readRegex(source, offset);
      else if (ID_START.test(pointAt(source, offset)) || c === '\\') token = readIdentifier(source, offset);
      else if (c === '#' && ID_START.test(pointAt(source, offset + 1))) token = readIdentifier(source, offset, true);
      else if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(source[offset + 1] || ''))) {
        const number = source.slice(offset).match(/^(?:0[xX][\da-fA-F_]+n?|0[bB][01_]+n?|0[oO][0-7_]+n?|(?:\d[\d_]*(?:\.[\d_]*)?|\.[\d_]+)(?:[eE][+-]?[\d_]+)?n?)/);
        token = { type: 'number', value: number[0], start, end: offset + number[0].length };
      } else {
        const operator = OPERATORS.find((value) => source.startsWith(value, offset) && !(value === '?.' && /[0-9]/.test(source[offset + 2] || '')));
        const value = operator || c;
        token = { type: 'punct', value, start, end: offset + value.length };
      }
      offset = token.end;
      const value = token.value;
      const context = top();
      const wasExpressionAllowed = expressionAllowed;
      const wasStatementStart = statementStart;
      token.statementPosition = statementStart;
      token.property = previous?.value === '.' || previous?.value === '?.' || token.type === 'private';

      if (token.type === 'name') {
        // Static clauses have a small closed grammar. Reading them separately
        // prevents imported/exported keyword names from creating code contexts.
        if (!token.escaped && !token.property && value === 'import') {
          const next = readSimpleToken(source, offset);
          if (next.value === '(') literalArgument(next.end);
          else if (contexts.length === 1 && !templateExpression && next.value !== '.') {
            const clause = readStaticClause(source, offset, 'import');
            if (clause) {
              if (clause.reference !== undefined) references.push(clause.reference);
              offset = clause.end;
              token = { type: 'module-clause', value: '', start, end: offset };
              expressionAllowed = true; statementStart = true; previous = token; continue;
            }
          }
        }
        if (!token.escaped && !token.property && value === 'export' && contexts.length === 1 && !templateExpression) {
          const next = readSimpleToken(source, offset);
          if (next.value === '{' || next.value === '*') {
            const clause = readStaticClause(source, offset, 'export');
            if (clause) {
              if (clause.reference !== undefined) references.push(clause.reference);
              offset = clause.end;
              token = { type: 'module-clause', value: '', start, end: offset };
              expressionAllowed = true; statementStart = true; previous = token; continue;
            }
          }
        }
        // A class field can end by ASI before the next named member. An
        // initializer's continuation operators are excluded from this change.
        if (context.kind === 'class-body' && context.memberPhase === 'value' && trivia.newline && !expressionAllowed && !['in', 'instanceof'].includes(value)) context.memberPhase = 'key';
        const memberName = isMembers(context) && context.memberPhase === 'key';
        token.property ||= memberName;
        if (!token.property && !token.escaped && (value === 'function' || value === 'class')) {
          let declaration = statementStart || previous?.value === 'export' || previous?.exportDefault === true;
          if (previous?.value === 'async' && !trivia.newline) declaration = previous.statementPosition;
          else if (trivia.newline && !expressionAllowed && isStatements(context)) declaration = true;
          contexts.push({ kind: `${value}-head`, expression: !declaration, conditional: 0 });
          expressionAllowed = true; statementStart = false;
        } else if (token.property) {
          expressionAllowed = false; statementStart = false;
        } else if (!token.escaped && value === 'debugger') {
          // DebuggerStatement takes no operand of its own. ASI ends the
          // statement at the next line terminator, so a slash beginning the
          // following line opens a regular expression (or a new statement)
          // rather than continuing a division. Only a non-property, unescaped
          // `debugger` is a statement; member access like obj.debugger and a
          // `debugger` member name remain ordinary operands.
          expressionAllowed = true; statementStart = true;
        } else if (value === 'export') {
          expressionAllowed = true; statementStart = true;
        } else if (value === 'default' && previous?.value === 'export') {
          token.exportDefault = true; expressionAllowed = true; statementStart = true;
        } else if (BLOCK_LEAD.has(value)) {
          expressionAllowed = true; statementStart = true;
        } else if (value === 'break' || value === 'continue') {
          restricted = value; expressionAllowed = true; statementStart = false;
        } else if (PREFIX.has(value)) {
          if (value === 'return' || value === 'yield') restricted = value;
          expressionAllowed = true; statementStart = false;
        } else if (value === 'of' && context.kind === 'control-paren' && context.control === 'for' && !expressionAllowed && !['var', 'let', 'const'].includes(previous?.value)) {
          expressionAllowed = true; statementStart = false;
        } else {
          // Contextual words such as of, async, from, get and set are ordinary
          // operands unless their enclosing syntactic context proves otherwise.
          expressionAllowed = false; statementStart = false;
        }
      } else if (token.type === 'private' || token.type === 'string' || token.type === 'number' || token.type === 'regex' || token.type === 'template') {
        expressionAllowed = false; statementStart = false;
      } else if (value === '(') {
        const control = previous && !previous.property && (CONTROL.has(previous.value) ? previous.value : previous.forAwait ? 'for' : undefined);
        const method = isMembers(context) && context.memberPhase === 'key' && previous && ['name', 'private', 'string', 'number'].includes(previous.type) || (isMembers(context) && context.memberPhase === 'key' && previous?.value === ']');
        contexts.push({ kind: control ? 'control-paren' : method ? 'method-paren' : 'paren', control, conditional: 0 });
        expressionAllowed = true; statementStart = false;
      } else if (value === '[') {
        contexts.push({ kind: 'bracket', conditional: 0 });
        expressionAllowed = true; statementStart = false;
      } else if (value === ')' || value === ']') {
        const closed = contexts.pop();
        if (!closed || contexts.length === 0) throw errorAt('Unbalanced delimiter', start);
        token.closed = closed.kind;
        expressionAllowed = closed.kind === 'control-paren';
        statementStart = expressionAllowed;
      } else if (value === '{') {
        let kind;
        if (context.kind === 'function-head') kind = 'function-body';
        else if (context.kind === 'class-head') kind = 'class-body';
        else if (previous?.value === '=>') kind = 'arrow-body';
        else if (previous?.closed === 'method-paren') kind = 'method-body';
        else if (statementStart || previous?.closed === 'control-paren' || BLOCK_LEAD.has(previous?.value) || (previous?.value === 'static' && context.kind === 'class-body') || (previous?.value === 'return' && trivia.newline)) kind = 'block';
        else kind = 'object';
        contexts.push({ kind, conditional: 0, memberPhase: 'key' });
        expressionAllowed = true; statementStart = isStatements(top());
      } else if (value === '}') {
        const closed = contexts.pop();
        if (!closed || contexts.length === 0) throw errorAt('Unbalanced brace', start);
        if (closed.kind === 'function-body' || closed.kind === 'class-body') {
          const owner = contexts.pop();
          if (!owner || contexts.length === 0) throw errorAt('Missing function/class context', start);
          expressionAllowed = !owner.expression;
        } else expressionAllowed = closed.kind !== 'object';
        if (closed.kind === 'method-body' && isMembers(top())) top().memberPhase = 'key';
        statementStart = expressionAllowed;
        token.closed = closed.kind;
      } else if (value === ';') {
        if (isMembers(context)) context.memberPhase = 'key';
        expressionAllowed = true; statementStart = isStatements(context); restricted = undefined;
      } else if (value === ',') {
        if (isMembers(context)) context.memberPhase = 'key';
        expressionAllowed = true; statementStart = false;
      } else if (value === ':') {
        if (context.conditional > 0) { context.conditional--; statementStart = false; }
        else if (isMembers(context)) { context.memberPhase = 'value'; statementStart = false; }
        else statementStart = isStatements(context);
        expressionAllowed = true;
      } else if (value === '?') {
        context.conditional++; expressionAllowed = true; statementStart = false;
      } else if (value === '.' || value === '?.') {
        expressionAllowed = false; statementStart = false;
      } else if (value === '++' || value === '--') {
        expressionAllowed = wasExpressionAllowed || trivia.newline; statementStart = false;
      } else {
        if (value === '=' && isMembers(context)) context.memberPhase = 'value';
        expressionAllowed = true; statementStart = false;
      }
      if (value === 'await' && previous?.value === 'for' && !previous.property) token.forAwait = true;
      if (value === 'async') token.statementPosition = wasStatementStart || previous?.exportDefault === true;
      if ((restricted === 'return' || restricted === 'yield') && value !== restricted) restricted = undefined;
      previous = token;
    }
    if (templateExpression) throw errorAt('Unterminated template expression', offset);
  }
  code();
  return references;
}
