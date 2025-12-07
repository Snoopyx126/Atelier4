import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ImageZoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  imageAlt: string;
}

const ImageZoomDialog = ({ isOpen, onClose, imageSrc, imageAlt }: ImageZoomDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-transparent border-none">
        <div className="relative w-full h-[80vh] flex items-center justify-center">
          <img
            src={imageSrc}
            alt={imageAlt}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageZoomDialog;
