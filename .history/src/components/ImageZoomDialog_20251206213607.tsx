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
            className="max-w-full max-h-full object-contain" 
          />
          
          {/* Composant de Fermeture (la Croix) */}
          <DialogClose asChild>
            {/* Positionnez le bouton en haut à droite (absolute top-4 right-4)
              - text-red-500 : Change la couleur en rouge.
              - hover:text-red-700 : Pour l'effet de survol.
              - p-1 : Ajoute un petit padding.
              - rounded-full : Arrondit le fond (invisible sur transparent).
              - z-10 : S'assure qu'il est au-dessus de l'image.
            */}
            <button
              className="absolute top-4 right-4 text-red-500 hover:text-red-700 p-1 rounded-full z-10 transition-colors"
              aria-label="Fermer"
            >
              {/* Utilisez l'icône X de Lucide-React, size 40 pour la rendre très visible */}
              <X size={10} /> 
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageZoomDialog;