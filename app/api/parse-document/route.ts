import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name.toLowerCase()
    let text = ''

    if (fileName.endsWith('.pdf')) {
      // Use pdf-parse
      const pdfParse = (await import('pdf-parse')).default
      const data = await pdfParse(buffer)
      text = data.text
    } else if (fileName.endsWith('.pptx')) {
      // Extract text from PPTX (it's a zip of XML files)
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(buffer)
      const slideFiles = Object.keys(zip.files).filter(f => f.startsWith('ppt/slides/slide') && f.endsWith('.xml'))
      for (const slideFile of slideFiles.sort()) {
        const content = await zip.files[slideFile].async('string')
        // Extract text between <a:t> tags
        const matches = content.match(/<a:t>([^<]*)<\/a:t>/g)
        if (matches) {
          text += matches.map(m => m.replace(/<\/?a:t>/g, '')).join(' ') + '\n'
        }
      }
    } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      text = buffer.toString('utf-8')
    } else if (fileName.endsWith('.docx')) {
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(buffer)
      const docXml = await zip.files['word/document.xml']?.async('string')
      if (docXml) {
        const matches = docXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g)
        if (matches) {
          text = matches.map(m => m.replace(/<\/?w:t[^>]*>/g, '')).join(' ')
        }
      }
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Use PDF, PPTX, DOCX, TXT, or MD.' }, { status: 400 })
    }

    // Truncate to ~50k chars to keep context manageable
    if (text.length > 50000) {
      text = text.slice(0, 50000) + '\n\n[Content truncated — first 50,000 characters shown]'
    }

    return NextResponse.json({ text: text.trim(), fileName: file.name })
  } catch (err) {
    console.error('Document parse error:', err)
    return NextResponse.json({ error: 'Failed to parse document' }, { status: 500 })
  }
}
