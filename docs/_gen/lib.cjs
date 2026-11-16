const fs = require('fs')
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, HeadingLevel, Footer, Header, PageNumber, BorderStyle, PageBreak, LevelFormat,
} = require('docx')

const W = 9638 // content width in DXA (A4, 2 cm margins)
const NAVY = '1F3864'

const run = (t, o = {}) => new TextRun({ text: t, ...o })
const P = (t, o = {}) => new Paragraph({ spacing: { after: 100 }, ...o, children: Array.isArray(t) ? t : [run(t)] })
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run(t)] })
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(t)] })
const bullet = (t) => new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 60 }, children: Array.isArray(t) ? t : [run(t)] })
const bullets = (arr) => arr.map(bullet)
const note = (t) => new Paragraph({
  spacing: { before: 60, after: 120 },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: '2E75B6', space: 8 } },
  children: [run(t, { italics: true, color: '404040' })],
})
const pageBreak = () => new Paragraph({ children: [new PageBreak()] })
const gap = () => P('', { spacing: { after: 60 } })

// monospaced block (text diagrams, code)
const code = (lines) => lines.map((l, i) => new Paragraph({
  spacing: { after: 0 },
  keepNext: i < lines.length - 1,
  keepLines: true,
  shading: { type: ShadingType.CLEAR, fill: 'F2F2F2', color: 'auto' },
  children: [run(l === '' ? ' ' : l, { font: 'Consolas', size: 15 })],
}))

const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' }
const borders = { top: border, bottom: border, left: border, right: border }

const FILLS = {
  Pass: 'E2F0D9', Implemented: 'E2F0D9',
  Fail: 'F8D7DA', 'Not implemented': 'F8D7DA', 'Expected fail': 'F8D7DA',
  Partial: 'FFF2CC', 'Not run': 'EDEDED', Skipped: 'EDEDED', 'Manual': 'EDEDED',
}
const fillFor = (c) => {
  const first = String(c).split('\n')[0].trim()
  return FILLS[first] || FILLS[Object.keys(FILLS).find(k => first.startsWith(k))]
}

function cell(text, width, o = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, borders,
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
    children: String(text).split('\n').map(l => new Paragraph({
      spacing: { after: 0 },
      children: [run(l, { bold: o.bold, color: o.color, size: o.size || 18, font: o.font })],
    })),
  })
}
// statusCol: index of a column to shade by status text; boldFirst: bold first column
function table(headers, rows, widths, statusCol = -1, opts = {}) {
  const size = opts.size || 18
  const head = new TableRow({
    tableHeader: true, cantSplit: true,
    children: headers.map((h, i) => cell(h, widths[i], { bold: true, color: 'FFFFFF', fill: NAVY, size })),
  })
  const body = rows.map(r => new TableRow({
    cantSplit: true,
    children: r.map((c, i) => cell(c, widths[i], {
      fill: i === statusCol ? fillFor(c) : undefined,
      bold: i === 0 && opts.boldFirst !== false,
      size,
    })),
  }))
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: widths, rows: [head, ...body] })
}

function titlePage({ title, subtitle, lines, meta }) {
  return [
    P('', { spacing: { before: 2400 } }),
    new Paragraph({ spacing: { after: 120 }, children: [run(title, { bold: true, size: 44, color: NAVY })] }),
    new Paragraph({ spacing: { after: 200 }, children: [run('E-Bookstore Platform (BookHaven)', { size: 32, color: '2E75B6' })] }),
    new Paragraph({ spacing: { after: 400 }, children: [run(subtitle, { size: 24, color: '595959' })] }),
    table(['Item', 'Detail'], meta, [2400, 7238]),
    pageBreak(),
  ]
}

function build(out, { title, headerText, footerText, kids }) {
  const doc = new Document({
    creator: 'E-Bookstore project', title,
    styles: {
      default: { document: { run: { font: 'Calibri', size: 21 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 30, bold: true, color: NAVY }, paragraph: { spacing: { before: 360, after: 140 }, outlineLevel: 0, keepNext: true } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 24, bold: true, color: '2E75B6' }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1, keepNext: true } },
      ],
    },
    numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(headerText, { size: 17, color: '7F7F7F' })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run(footerText + '  |  Page ', { size: 17, color: '7F7F7F' }), new TextRun({ children: [PageNumber.CURRENT], size: 17, color: '7F7F7F' })] })] }) },
      children: kids,
    }],
  })
  return Packer.toBuffer(doc).then(b => { fs.writeFileSync(out, b); console.log('written', out, b.length, 'bytes') })
}

module.exports = { W, NAVY, run, P, H1, H2, bullet, bullets, note, gap, code, pageBreak, cell, table, titlePage, build }
