# Corpus — download these (Day 1, ~15 minutes)

Put the official FTA/MoF PDFs in this folder, then run `python ingest.py` from `backend/`.

1. Federal Decree-Law No. 47 of 2022 — Corporate Tax Law → tax.gov.ae → Legislation
2. Federal Decree-Law No. 8 of 2017 — VAT (as amended) → tax.gov.ae → Legislation
3. Cabinet Decision No. 52 of 2017 — VAT Executive Regulation
4. FTA Corporate Tax General Guide (CTGGCT1)
5. FTA Small Business Relief guide
6. 1–2 FTA VAT invoicing/registration guides

Name files descriptively (the filename becomes the citation label), e.g.
`Corporate-Tax-Law-47-2022.pdf` → citations show `[Corporate-Tax-Law-47-2022 | Article 3]`.

Then commit the generated `data/chunks.json` (the PDFs themselves are gitignored).
