import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { X } from "lucide-react"; // Importez l'icône X (la croix)

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
        {/*
          Modifiez la classe du DialogContent :
          - max-w-4xl augmente la taille maximale de la modale.
        */}
        <div className="relative w-full h-[80vh] flex items-center justify-center">
          <img
            src={imageSrc}
            alt={imageAlt}
            // max-w-full max-h-full: assure que l'image remplit l'espace sans déborder
            
          />
          
          {/* Composant de Fermeture (la Croix) */}
          
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageZoomDialog;