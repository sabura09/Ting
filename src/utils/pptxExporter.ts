// Helper utility to generate native PowerPoint (.pptx) presentation matching AI Suite design system

export interface SlideData {
    slideNumber: number;
    type?: string;
    badge?: string;
    title: string;
    subtitle?: string;
    gradientText?: string;
    cta?: string;
    points?: string[];
    metrics?: { label: string; value: string }[];
    cards?: { title: string; subtitle?: string; description?: string; icon?: string; role?: string }[];
    stats?: { value: string; label: string; desc?: string }[];
    tiers?: { name: string; price: string; features: string[]; popular?: boolean }[];
    // Image & background customization
    image?: string;
    backgroundGradient?: string;
    backgroundColor?: string;
    layout?: 'default' | 'image-right' | 'image-left' | 'image-full' | 'centered';
}

export async function exportToPowerPoint(slides?: SlideData[]) {
    try {
        const pptxgen = (await import('pptxgenjs')).default;
        const pptx = new pptxgen();

        pptx.layout = 'LAYOUT_16x9'; // 16:9 widescreen layout
        pptx.author = 'AI Suite';
        pptx.company = 'AI Suite Inc.';
        pptx.title = 'AI Generated Presentation Deck';
        pptx.subject = 'AI-Powered Digital Web Infrastructure';

        // Palette definitions
        const COLOR_BG_DARK = '090D16';
        const COLOR_CARD_BG = '131B2E';
        const COLOR_CARD_BORDER = '2A3754';
        const COLOR_VIOLET = '7C3AED';
        const COLOR_PINK = 'EC4899';
        const COLOR_BLUE = '3B82F6';
        const COLOR_CYAN = '06B6D4';
        const COLOR_WHITE = 'FFFFFF';
        const COLOR_MUTED = '94A3B8';

        // If custom AI slides provided, generate them!
        if (slides && slides.length > 0) {
            slides.forEach((sl) => {
                const pptSlide = pptx.addSlide();

                // Custom Background Color or Gradient Parsing
                if (sl.backgroundColor) {
                    pptSlide.background = { color: sl.backgroundColor.replace('#', '') };
                } else if (sl.backgroundGradient) {
                    const hexColorMatch = sl.backgroundGradient.match(/#[0-9a-fA-F]{3,8}/);
                    if (hexColorMatch) {
                        pptSlide.background = { color: hexColorMatch[0].replace('#', '') };
                    } else {
                        pptSlide.background = { color: COLOR_BG_DARK };
                    }
                } else {
                    pptSlide.background = { color: COLOR_BG_DARK };
                }

                // Background container box
                pptSlide.addShape((pptx as any).shapes.RECTANGLE, {
                    x: 0.5, y: 0.5, w: 12.33, h: 6.5,
                    fill: { color: COLOR_CARD_BG, transparency: 85 },
                    line: { color: COLOR_CARD_BORDER, width: 1 }
                });

                const hasImage = !!sl.image;
                const isImageLeft = sl.layout === 'image-left';

                let textX = 0.8;
                let textWidth = 11.5;
                let imageX = 7.0;

                if (hasImage) {
                    if (isImageLeft) {
                        textX = 6.8;
                        textWidth = 5.5;
                        imageX = 0.8;
                    } else {
                        textX = 0.8;
                        textWidth = 5.8;
                        imageX = 7.0;
                    }
                }

                // Badge
                if (sl.badge) {
                    pptSlide.addText(sl.badge.toUpperCase(), {
                        x: textX, y: 0.8, w: textWidth, h: 0.35,
                        fontSize: 11, bold: true, color: COLOR_PINK
                    });
                }

                // Main Title
                pptSlide.addText(sl.title, {
                    x: textX, y: 1.2, w: textWidth, h: 0.9,
                    fontSize: 26, bold: true, color: COLOR_WHITE, fontFace: 'Trebuchet MS'
                });

                // Subtitle
                if (sl.subtitle) {
                    pptSlide.addText(sl.subtitle, {
                        x: textX, y: 2.1, w: textWidth, h: 0.6,
                        fontSize: 13, color: COLOR_MUTED, fontFace: 'Calibri'
                    });
                }

                // Image embedding
                if (hasImage && sl.image) {
                    pptSlide.addImage({
                        path: sl.image,
                        x: imageX,
                        y: 1.5,
                        w: 5.5,
                        h: 4.8
                    });
                }

                // Render metrics/stats if present
                if (sl.metrics || sl.stats) {
                    const items = sl.metrics || sl.stats || [];
                    items.forEach((st: any, idx: number) => {
                        const col = idx % (hasImage ? 2 : 4);
                        const row = Math.floor(idx / (hasImage ? 2 : 4));
                        const colWidth = hasImage ? 2.85 : 2.95;
                        const xPos = textX + col * colWidth;
                        const yPos = 2.9 + row * 1.8;

                        pptSlide.addShape((pptx as any).shapes.ROUNDED_RECTANGLE, {
                            x: xPos, y: yPos, w: hasImage ? 2.6 : 2.7, h: 1.6,
                            fill: { color: '182238' },
                            line: { color: COLOR_CARD_BORDER, width: 1 },
                            rectRadius: 0.15
                        });

                        pptSlide.addText(st.value || st.val || '', {
                            x: xPos + 0.15, y: yPos + 0.2, w: hasImage ? 2.3 : 2.4, h: 0.5,
                            fontSize: 20, bold: true, color: COLOR_PINK
                        });

                        pptSlide.addText(st.label || st.title || '', {
                            x: xPos + 0.15, y: yPos + 0.75, w: hasImage ? 2.3 : 2.4, h: 0.35,
                            fontSize: 11, bold: true, color: COLOR_WHITE
                        });

                        if (st.desc) {
                            pptSlide.addText(st.desc, {
                                x: xPos + 0.15, y: yPos + 1.1, w: hasImage ? 2.3 : 2.4, h: 0.4,
                                fontSize: 9, color: COLOR_MUTED
                            });
                        }
                    });
                }

                // Render cards
                if (sl.cards && sl.cards.length > 0) {
                    sl.cards.forEach((cd: any, idx: number) => {
                        const col = idx % 3;
                        const row = Math.floor(idx / 3);
                        const xPos = 0.8 + col * 3.9;
                        const yPos = 2.9 + row * 1.9;

                        pptSlide.addShape((pptx as any).shapes.ROUNDED_RECTANGLE, {
                            x: xPos, y: yPos, w: 3.6, h: 1.7,
                            fill: { color: '182238' },
                            line: { color: COLOR_CARD_BORDER, width: 1 },
                            rectRadius: 0.15
                        });

                        pptSlide.addText(cd.title, {
                            x: xPos + 0.2, y: yPos + 0.2, w: 3.2, h: 0.4,
                            fontSize: 14, bold: true, color: COLOR_WHITE
                        });

                        if (cd.role) {
                            pptSlide.addText(cd.role, {
                                x: xPos + 0.2, y: yPos + 0.6, w: 3.2, h: 0.3,
                                fontSize: 11, color: COLOR_CYAN, bold: true
                            });
                        }

                        if (cd.description || cd.desc) {
                            pptSlide.addText(cd.description || cd.desc, {
                                x: xPos + 0.2, y: yPos + 0.9, w: 3.2, h: 0.7,
                                fontSize: 11, color: COLOR_MUTED
                            });
                        }
                    });
                }

                // Render bullet points
                if (sl.points && sl.points.length > 0) {
                    sl.points.forEach((pt: string, idx: number) => {
                        const yPos = 2.9 + idx * 0.65;
                        pptSlide.addShape((pptx as any).shapes.ROUNDED_RECTANGLE, {
                            x: 0.8, y: yPos, w: 11.5, h: 0.55,
                            fill: { color: '182238' },
                            line: { color: COLOR_CARD_BORDER, width: 1 },
                            rectRadius: 0.1
                        });

                        pptSlide.addText('✓   ' + pt, {
                            x: 1.1, y: yPos + 0.1, w: 11.0, h: 0.35,
                            fontSize: 12, bold: true, color: COLOR_WHITE
                        });
                    });
                }

                // Render pricing tiers if present
                if (sl.tiers && sl.tiers.length > 0) {
                    sl.tiers.forEach((tr: any, idx: number) => {
                        const xPos = 0.8 + idx * 3.9;
                        pptSlide.addShape((pptx as any).shapes.ROUNDED_RECTANGLE, {
                            x: xPos, y: 2.8, w: 3.6, h: 3.5,
                            fill: { color: tr.popular ? '1E1638' : '182238' },
                            line: { color: tr.popular ? COLOR_VIOLET : COLOR_CARD_BORDER, width: tr.popular ? 2 : 1 },
                            rectRadius: 0.15
                        });

                        pptSlide.addText(tr.name, {
                            x: xPos + 0.2, y: 3.0, w: 3.2, h: 0.4,
                            fontSize: 16, bold: true, color: COLOR_WHITE
                        });

                        pptSlide.addText(tr.price, {
                            x: xPos + 0.2, y: 3.4, w: 3.2, h: 0.5,
                            fontSize: 24, bold: true, color: COLOR_PINK
                        });

                        if (tr.features) {
                            tr.features.forEach((ft: string, fIdx: number) => {
                                pptSlide.addText('• ' + ft, {
                                    x: xPos + 0.2, y: 4.1 + fIdx * 0.3, w: 3.2, h: 0.25,
                                    fontSize: 10, color: COLOR_WHITE
                                });
                            });
                        }
                    });
                }
            });

            await pptx.writeFile({ fileName: `AI_Presentation_Deck.pptx` });
            return;
        }

        // Fallback default deck generation if no custom slides passed
        const slide1 = pptx.addSlide();
        slide1.background = { color: COLOR_BG_DARK };

        slide1.addText('🚀  NEXT-GEN AI PRESENTATION BUILDER', {
            x: 1.0, y: 1.2, w: 5.5, h: 0.4,
            fontSize: 11, bold: true, color: COLOR_VIOLET,
            fill: { color: '2E1065' }, align: 'center', rectRadius: 0.2
        });

        slide1.addText('AI Suite Presentation Deck', {
            x: 1.0, y: 1.8, w: 10.0, h: 1.5,
            fontSize: 36, bold: true, color: COLOR_WHITE
        });

        await pptx.writeFile({ fileName: `AI_Presentation_Deck.pptx` });

    } catch (err) {
        console.error("Error generating PowerPoint export:", err);
        throw err;
    }
}
