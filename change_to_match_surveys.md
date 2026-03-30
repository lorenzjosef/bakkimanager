Please inspect this repository and implement support for tree surveys on arbitrary plot geometries.

New requirement:
- surveys must work for plots that may overlap multiple areas and zones
- surveys must support estimating tree count and tree size metrics
- different parts of the same plot may have different density/size characteristics

Current issue:
- tree data is currently tied too closely to `areas`
- that makes survey updates incorrect when a plot spans multiple areas/zones or when density varies within one area

What to do:
- analyze the current domain model and find the best repo-aligned way to support this. Analyse if a per tree model is feasible if 120.000 tress are to be planted.
- treat areas/zones as reporting boundaries rather than the only source of truth for tree data
- support both exact tree data and survey-based estimated data if the codebase needs both
- update persistence, services, and APIs accordingly
- keep changes as small and maintainable as possible
- add tests

Please start by explaining:
1. how the current implementation works
2. why it does not satisfy the new requirement
3. what change you will make

Then implement the change and summarize the result.