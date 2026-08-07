"use client";

import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

interface Asset {
    id: string;
    type: 'image' | 'video' | 'avatar' | 'text' | 'logo' | 'thumbnail' | 'manga';
    url?: string;
    prompt?: string;
}

interface AssetViewerProps {
    open: boolean;
    close: () => void;
    assets: Asset[];
    currentIndex: number;
}

export function AssetViewer({ open, close, assets, currentIndex }: AssetViewerProps) {
    const slides = assets.map((asset) => {
        if (asset.type === 'video') {
            return {
                type: "video" as const,
                sources: [
                    {
                        src: asset.url || null as any,
                        type: "video/mp4",
                    },
                ],
                autoPlay: true,
                controls: true,
                title: asset.prompt || "AI Video",
            };
        }
        return {
            src: asset.url || null as any,
            alt: asset.prompt || "AI Image",
            title: asset.prompt || "AI Image",
        };
    });

    return (
        <Lightbox
            open={open}
            close={close}
            index={currentIndex}
            slides={slides}
            plugins={[Video, Zoom]}
            video={{
                autoPlay: true,
                controls: true,
                playsInline: true,
            }}
            animation={{ fade: 300, swipe: 500 }}
            styles={{
                container: { backgroundColor: "rgba(0, 0, 0, 0.9)" },
            }}
        />
    );
}
