from mizan.chunker import chunk_document

SAMPLE = """This law regulates the taxation of corporations in the State.

Article 1 — Definitions
Taxable Person means a person subject to Corporate Tax. Revenue means the gross amount of income.

Article 2 — Imposition of Tax
The rate shall be zero percent on the portion not exceeding the threshold. The rate shall be nine percent above the threshold.
"""


def test_structure_and_labels():
    chunks = chunk_document(SAMPLE, doc_name="ct-law")
    arts = {c.article for c in chunks}
    assert {"Preamble", "Article 1", "Article 2"} <= arts
    nine = [c for c in chunks if "nine percent" in c.body]
    assert nine and all(c.article == "Article 2" for c in nine)
    for c in chunks:
        assert c.text.startswith(f"[{c.doc_name} | {c.article}]")


def test_size_bound_and_no_loss():
    small = chunk_document(SAMPLE, doc_name="ct-law", max_chars=100)
    assert all(len(c.body) <= 100 for c in small)
    joined = " ".join(c.body for c in small)
    assert "nine percent above the threshold" in joined
    assert "Taxable Person means a person" in joined


def test_bracketed_article_numbers():
    txt = "Article (5) — Exempt Persons\nA Government Entity is exempt."
    chunks = chunk_document(txt, doc_name="x")
    assert chunks[0].article == "Article 5"


def test_empty():
    assert chunk_document("", doc_name="x") == []
    assert chunk_document("   \n ", doc_name="x") == []
