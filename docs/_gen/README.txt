Rebuild the documents (Node 18+):
  cd docs\_gen
  npm install docx
  node gen.cjs     ..\EBookstore-BRD.docx
  node gen-hld.cjs ..\EBookstore-HLD.docx
  node gen-lld.cjs ..\EBookstore-LLD.docx
  node gen-tc.cjs  ..\EBookstore-TestCases.docx

lib.cjs holds the shared helpers used by the HLD, LLD and Test Cases generators.
Test case data lives at the top of gen-tc.cjs (array MODS); update the Result and Evidence
fields after each test run and re-generate.
Edit these files with an editor that keeps UTF-8 (not PowerShell Get-Content/Set-Content).
