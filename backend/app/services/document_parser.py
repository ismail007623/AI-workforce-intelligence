from io import BytesIO

from docx import Document
from pypdf import PdfReader

ALLOWED_EXTENSIONS = {".pdf", ".docx"}


def _extension(filename: str) -> str:
    dot = filename.rfind(".")
    if dot == -1:
        return ""
    return filename[dot:].lower()


def extract_text(filename: str, content: bytes) -> str:
    ext = _extension(filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError("Only PDF and DOCX files are supported.")

    if ext == ".pdf":
        reader = PdfReader(BytesIO(content))
        parts = [page.extract_text() or "" for page in reader.pages]
        text = "\n".join(parts).strip()
    else:
        doc = Document(BytesIO(content))
        text = "\n".join(p.text for p in doc.paragraphs if p.text.strip()).strip()

    if not text:
        raise ValueError("Could not extract any text from the document.")

    return text
