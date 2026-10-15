# Issue tracker: GitHub

Issues and specs live in GitHub Issues for Francis-Lee-210/INFOSYS-A3.
Use the gh CLI from this checkout, or pass
--repo Francis-Lee-210/INFOSYS-A3 explicitly.

## Conventions

- Create: gh issue create --title "..." --body-file <body-file>
- Read: gh issue view <number> --json number,title,body,labels,comments
- List: gh issue list --state open --json number,title,body,labels,comments
  Use --label and --state filters as needed.
- Comment: gh issue comment <number> --body-file <body-file>
- Label: gh issue edit <number> --add-label "..."
  or --remove-label "..."
- Close: gh issue close <number>
- Store multiline bodies in a temporary UTF-8 file and pass --body-file.

When a skill says "publish to the issue tracker", create a GitHub issue.
When it says "fetch the relevant ticket", read the referenced issue.

## Pull requests as a triage surface

PRs as a request surface: no.

GitHub shares issue and PR numbers. Resolve the referenced object
before applying issue-specific operations.

## Wayfinding operations

- Map: one issue labelled wayfinder:map, containing Notes,
  Decisions-so-far and Fog.
- Child: one issue per ticket, labelled wayfinder:<type>, where type
  is research, prototype, grilling or task.
- Parent linkage: use native sub-issues when supported; otherwise
  put "Part of #<parent>" at the top of the child and link it in
  the parent's task list.
- Blocking: use native issue dependencies when supported; otherwise
  put "Blocked by: #<number>" at the top of the child.
- Frontier: the first open, unassigned child in map order with
  no open blocker.
- Claim: gh issue edit <number> --add-assignee @me
- Resolve: post the answer, close the child, and add an answer/context
  pointer to the map's Decisions-so-far.
