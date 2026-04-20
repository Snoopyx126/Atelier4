// src/components/ImageZoomDialog.tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  imageAlt: string;
}

const ImageZoomDialog = ({ isOpen, onClose, imageSrc, imageAlt }: Props) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-[#0F0E0C]/98 border border-[#C9A96E]/20">
        <div className="relative w-full flex items-center justify-center" style={{ minHeight: "60vh" }}>

          <img
            src={imageSrc}
            alt={imageAlt}
            className="max-w-full max-h-[80vh] object-contain"
          />

          {/* Bouton fermeture */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 border border-[#C9A96E]/30 hover:border-[#C9A96E] flex items-center justify-center text-[#F7F4EE]/60 hover:text-[#C9A96E] transition-all duration-300"
          >
            <X size={14} />
          </button>

          {/* Légende */}
          {imageAlt && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <span className="font-sans-dm text-[9px] tracking-[0.25em] uppercase text-[#C9A96E]/60 border border-[#C9A96E]/20 px-4 py-1.5 bg-[#0F0E0C]/80 backdrop-blur-sm">
                {imageAlt}
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageZoomDialog;
