from dataclasses import dataclass
from io import BytesIO

from docx import Document
from pypdf import PdfReader

ALLOWED_EXTENSIONS = {".pdf", ".docx"}


@dataclass
class ParsedDocument:
    text: str
    page_count: int


def _extension(filename: str) -> str:
    dot = filename.rfind(".")
    if dot == -1:
        return ""
    return filename[dot:].lower()


def parse_document(filename: str, content: bytes) -> ParsedDocument:
    ext = _extension(filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError("Only PDF and DOCX files are supported.")

    if ext == ".pdf":
        reader = PdfReader(BytesIO(content))
        page_count = len(reader.pages)
        parts = [page.extract_text() or "" for page in reader.pages]
        text = "\n".join(parts).strip()
    else:
        doc = Document(BytesIO(content))
        text = "\n".join(p.text for p in doc.paragraphs if p.text.strip()).strip()
        page_count = max(1, len(text) // 3000)

    if not text:
        raise ValueError("Could not extract any text from the document.")

    return ParsedDocument(text=text, page_count=page_count)


def extract_text(filename: str, content: bytes) -> str:
    return parse_document(filename, content).text
