import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

/**
 * Exports markdown content to a .md file
 */
export const exportToMarkdown = (content: string, filename: string = 'website-wiki.md') => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, filename);
};

/**
 * Exports content to a PDF file
 * Improved with basic markdown rendering for headers
 */
export const exportToPDF = async (content: string, filename: string = 'website-wiki.pdf') => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    
    const lines = content.split('\n');
    let y = 20;
    const pageHeight = doc.internal.pageSize.getHeight();

    for (const line of lines) {
        // Handle headers
        const headerMatch = line.match(/^(#{1,6})\s+(.*)/);
        if (headerMatch) {
            const level = headerMatch[1].length;
            const text = headerMatch[2];
            
            // Set font for headers
            doc.setFont('helvetica', 'bold');
            const fontSize = level === 1 ? 22 : level === 2 ? 18 : 14;
            doc.setFontSize(fontSize);
            
            // Handle wrapping for headers
            const splitHeader = doc.splitTextToSize(text, maxWidth);
            for (const hLine of splitHeader) {
                if (y + 10 > pageHeight - margin) {
                    doc.addPage();
                    y = 20;
                }
                doc.text(hLine, margin, y);
                y += (fontSize / 2);
            }
            y += 5; // Extra space after header
            continue;
        }

        // Handle list items
        const isListItem = line.trim().startsWith('- ') || line.trim().startsWith('* ');
        const cleanLine = line.replace(/^\s*[-*]\s+/, '• ');
        
        // Handle normal text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        
        // Remove bold markers for PDF (basic cleanup until multi-style lines are supported)
        const textToRender = cleanLine.replace(/\*\*(.*?)\*\*/g, '$1');
        
        const splitText = doc.splitTextToSize(textToRender, maxWidth);
        for (const tLine of splitText) {
            if (y + 7 > pageHeight - margin) {
                doc.addPage();
                y = 20;
            }
            doc.text(tLine, margin, y);
            y += 7;
        }
    }
    
    doc.save(filename);
};

/**
 * Exports content to a .docx file
 * Improved with inline bold support and header styling
 */
export const exportToDocx = async (content: string, filename: string = 'website-wiki.docx') => {
    const lines = content.split('\n');
    
    const children = lines.map(line => {
        // Handle headers
        const headerMatch = line.match(/^(#{1,6})\s+(.*)/);
        if (headerMatch) {
            const level = headerMatch[1].length;
            const text = headerMatch[2];
            
            return new Paragraph({
                children: [
                    new TextRun({
                        text: text,
                        bold: true,
                        size: level === 1 ? 36 : level === 2 ? 32 : 28, // docx size is half-points
                    }),
                ],
                spacing: { after: 200, before: 400 },
            });
        }

        // Handle normal lines with potential inline bolding
        const parts: TextRun[] = [];
        let remaining = line;

        // Simple regex-based inline parser for **bold**
        const boldRegex = /\*\*(.*?)\*\*/g;
        let lastIndex = 0;
        let match;

        while ((match = boldRegex.exec(line)) !== null) {
            // Add text before bold
            if (match.index > lastIndex) {
                parts.push(new TextRun({
                    text: line.substring(lastIndex, match.index),
                }));
            }
            // Add bold text
            parts.push(new TextRun({
                text: match[1],
                bold: true,
            }));
            lastIndex = boldRegex.lastIndex;
        }

        // Add remaining text
        if (lastIndex < line.length) {
            parts.push(new TextRun({
                text: line.substring(lastIndex),
            }));
        }

        if (parts.length === 0 && line.trim() === "") {
            return new Paragraph({
                children: [new TextRun("")],
                spacing: { after: 100 }
            });
        }

        return new Paragraph({
            children: parts.length > 0 ? parts : [new TextRun(line)],
            spacing: { after: 120 }
        });
    });

    const doc = new Document({
        sections: [{
            properties: {},
            children: children,
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, filename);
};
