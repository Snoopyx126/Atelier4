import React, { useState, Suspense, useMemo } from 'react';
import Navigation from "@/components/Navigation";
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Text, Float, Environment, PivotControls } from '@react-three/drei';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Palette, Gem, Type, Shapes, RotateCw, Move } from "lucide-react";
import * as THREE from 'three';

// --- GESTION DES FORMES (DESSIN 3D) ---
const getLensShape = (type: string) => {
  const shape = new THREE.Shape();

  if (type === 'rond') {
    shape.absarc(0, 0, 1.5, 0, Math.PI * 2, false);
  } 
  else if (type === 'carre') {
    const s = 1.3;
    shape.moveTo(-s, -s);
    shape.lineTo(s, -s);
    shape.lineTo(s, s);
    shape.lineTo(-s, s);
    shape.lineTo(-s, -s);
  } 
  else if (type === 'hexagonal') {
    const s = 1.4;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = Math.cos(angle) * s;
      const y = Math.sin(angle) * s;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
  }
  else if (type === 'aviator') {
    // Forme complexe Aviateur dessinée point par point
    shape.moveTo(-1.2, 1.0); // Haut gauche
    shape.lineTo(1.2, 1.0);  // Haut droite (barre droite)
    shape.bezierCurveTo(1.6, 1.0, 1.6, -0.5, 1.0, -1.2); // Courbe bas droite
    shape.bezierCurveTo(0.5, -1.5, -0.5, -1.5, -1.0, -1.2); // Bas milieu
    shape.bezierCurveTo(-1.6, -0.5, -1.6, 1.0, -1.2, 1.0); // Retour haut gauche
  }

  return shape;
};

// --- COMPOSANT 3D : LE VERRE ---
const Lens3D = ({ shapeType, color, diamondCut, engraving }: any) => {
  
  // 1. Création de la géométrie basée sur la forme choisie
  const geometrySettings = useMemo(() => {
    const shape = getLensShape(shapeType);
    return {
      depth: 0.2, // Epaisseur du verre
      bevelEnabled: diamondCut, // Activation du Diamond Cut
      bevelThickness: 0.2, // Largeur du biseau
      bevelSize: 0.1,      // Taille du biseau
      bevelSegments: 2     // Facettes (peu de segments = effet diamant)
    };
  }, [shapeType, diamondCut]);

  const shapeObject = useMemo(() => getLensShape(shapeType), [shapeType]);

  // 2. Matériau du verre (Réaliste)
  const glassMaterialProps = {
    transmission: 0.95, 
    thickness: 2.0,  
    roughness: 0.1,    
    clearcoat: 1,    
    color: color,    
    attenuationDistance: 0.5,
    attenuationColor: color
  };

  return (
    <group>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
        
        {/* LE VERRE EXTRUDÉ */}
        <mesh position={[0, 0, 0]}>
          <extrudeGeometry args={[shapeObject, geometrySettings]} />
          <meshPhysicalMaterial {...glassMaterialProps} side={THREE.DoubleSide} />
        </mesh>

        {/* GRAVURE DÉPLAÇABLE */}
        {engraving && (
          <PivotControls 
            anchor={[0, 0, 0]} // Point de pivot au centre
            depthTest={false} 
            activeAxes={[true, true, false]} // On ne bouge que X et Y, pas Z (profondeur)
            scale={0.5} // Taille des flèches de contrôle
            disableRotations // Pas de rotation pour simplifier
          >
            <Text
              position={[0, 0, 0.22]} // Juste devant le verre (0.2 épaisseur + marge)
              fontSize={0.25}
              color="white"
              anchorX="center"
              anchorY="middle"
              // Police par défaut (fiable)
              font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2" 
            >
              {engraving}
            </Text>
          </PivotControls>
        )}

      </Float>
    </group>
  );
};

// --- PAGE PRINCIPALE ---
const Configurateur = () => {
  const [shape, setShape] = useState('rond');
  const [tint, setTint] = useState('#aaddff'); 
  const [diamondCut, setDiamondCut] = useState(false);
  const [engraving, setEngraving] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      
      <div className="flex-grow flex flex-col lg:flex-row h-[calc(100vh-80px)] pt-20">
        
        {/* ZONE 3D */}
        <div className="w-full lg:w-2/3 h-[50vh] lg:h-full bg-gradient-to-br from-slate-200 to-slate-400 relative">
            
            <Canvas shadows camera={{ position: [0, 0, 6], fov: 35 }}>
                <Suspense fallback={null}>
                    <Stage environment="city" intensity={0.6}>
                        <Lens3D shapeType={shape} color={tint} diamondCut={diamondCut} engraving={engraving} />
                    </Stage>
                    <OrbitControls makeDefault />
                    <Environment preset="warehouse" /> 
                </Suspense>
            </Canvas>

            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-sm text-xs font-bold text-gray-700 flex flex-col gap-1">
                <div className="flex items-center gap-2"><RotateCw className="w-3 h-3" /> Tournez avec la souris</div>
                {engraving && <div className="flex items-center gap-2 text-blue-600"><Move className="w-3 h-3" /> Déplacez le texte avec les flèches sur le verre</div>}
            </div>
        </div>

        {/* PANNEAU DE CONTRÔLE */}
        <div className="w-full lg:w-1/3 bg-white border-l border-gray-200 p-6 overflow-y-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-playfair font-bold text-gray-900">Atelier Sur-Mesure</h1>
                <p className="text-gray-500 text-sm">Créez votre verre unique.</p>
            </div>

            <Tabs defaultValue="forme" className="space-y-6">
                <TabsList className="grid grid-cols-4 bg-gray-100 p-1 rounded-lg">
                    <TabsTrigger value="forme"><Shapes className="w-4 h-4" /></TabsTrigger>
                    <TabsTrigger value="couleur"><Palette className="w-4 h-4" /></TabsTrigger>
                    <TabsTrigger value="finition"><Gem className="w-4 h-4" /></TabsTrigger>
                    <TabsTrigger value="gravure"><Type className="w-4 h-4" /></TabsTrigger>
                </TabsList>

                {/* 1. FORME */}
                <TabsContent value="forme" className="space-y-4">
                    <h3 className="font-bold text-sm uppercase text-gray-500">Forme du verre</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <Button variant={shape === 'rond' ? 'default' : 'outline'} onClick={() => setShape('rond')}>Ronde</Button>
                        <Button variant={shape === 'carre' ? 'default' : 'outline'} onClick={() => setShape('carre')}>Carrée</Button>
                        <Button variant={shape === 'hexagonal' ? 'default' : 'outline'} onClick={() => setShape('hexagonal')}>Hexagonale</Button>
                        <Button variant={shape === 'aviator' ? 'default' : 'outline'} onClick={() => setShape('aviator')}>Aviateur</Button>
                    </div>
                </TabsContent>

                {/* 2. COULEUR */}
                <TabsContent value="couleur" className="space-y-4">
                    <h3 className="font-bold text-sm uppercase text-gray-500">Teinte</h3>
                    <div className="grid grid-cols-5 gap-3">
                        {['#aaddff', '#ffcce6', '#ccffcc', '#ffffcc', '#aaaaaa', '#e6ccff', '#cd7f32', '#ffffff', '#000000', '#ff0000'].map((c) => (
                            <button
                                key={c}
                                onClick={() => setTint(c)}
                                className={`w-8 h-8 rounded-full border-2 transition-transform ${tint === c ? 'border-black scale-110' : 'border-gray-200'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                    <div className="pt-4">
                        <Label>Intensité</Label>
                        <Slider defaultValue={[50]} max={100} step={1} className="mt-2" />
                    </div>
                </TabsContent>

                {/* 3. FINITION */}
                <TabsContent value="finition" className="space-y-4">
                    <h3 className="font-bold text-sm uppercase text-gray-500">Bords</h3>
                    <div className="grid grid-cols-1 gap-3">
                        <div 
                            className={`p-3 border rounded-lg cursor-pointer flex items-center gap-3 ${!diamondCut ? 'border-black bg-gray-50' : 'border-gray-200'}`}
                            onClick={() => setDiamondCut(false)}
                        >
                            <div className="w-8 h-8 rounded-full bg-gray-300"></div>
                            <div><p className="font-bold text-sm">Standard</p><p className="text-xs text-gray-500">Poli brillant classique</p></div>
                        </div>
                        <div 
                            className={`p-3 border rounded-lg cursor-pointer flex items-center gap-3 ${diamondCut ? 'border-black bg-blue-50' : 'border-gray-200'}`}
                            onClick={() => setDiamondCut(true)}
                        >
                            <Gem className="w-8 h-8 text-blue-500" />
                            <div><p className="font-bold text-sm">Diamond Cut</p><p className="text-xs text-gray-500">Facettes précieuses</p></div>
                        </div>
                    </div>
                </TabsContent>

                {/* 4. GRAVURE */}
                <TabsContent value="gravure" className="space-y-4">
                    <h3 className="font-bold text-sm uppercase text-gray-500">Personnalisation</h3>
                    <div className="space-y-2">
                        <Label>Votre texte (Initiales, Date...)</Label>
                        <Input 
                            placeholder="Entrez le texte ici..." 
                            maxLength={10}
                            value={engraving} 
                            onChange={(e) => setEngraving(e.target.value)} 
                        />
                        <p className="text-xs text-blue-600 font-medium mt-2">
                            💡 Astuce : Utilisez les flèches qui apparaissent sur le verre pour placer le texte où vous voulez !
                        </p>
                    </div>
                </TabsContent>
            </Tabs>

            <div className="mt-10 border-t pt-6">
                <Button className="w-full bg-black text-white h-12 text-lg hover:bg-gray-800">
                    Valider ce design
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Configurateur;