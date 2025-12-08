import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// ✅ CORRECTION DE L'IMPORT : Ajout de Glasses ici
import { Eye, Clock, FileText, Users, MapPin, Mail, Phone, Home, ShoppingCart, CheckCircle2, Calendar, LayoutDashboard, Glasses } from "lucide-react"; 

// ✅ Interface UserData mise à jour
interface UserData { 
    id: string; 
    email: string; 
    nomSociete: string; 
    siret: string; 
    phone?: string;
    address?: string; 
    zipCity?: string;
}

interface KPI {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
}

const DashboardPro = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState<KPI[]>([]);

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (!userStr) { navigate("/espace-pro"); return; }
        
        try {
            const userData: UserData = JSON.parse(userStr);
            
            // Simuler la récupération des champs d'adresse (à retirer si votre API de login les fournit)
            const userWithAddress = {
                ...userData,
                address: userData.address || "12 Rue de la Monture", 
                zipCity: userData.zipCity || "75001 Optique Ville" 
            };
            
            setUser(userWithAddress);

            // Simuler des données de KPI
            setKpis([
                { title: "Commandes en cours", value: 3, icon: Clock, color: "text-orange-500" },
                { title: "Commandes terminées", value: 45, icon: CheckCircle2, color: "text-green-500" },
                { title: "Montage le plus récent (jours)", value: 12, icon: Calendar, color: "text-blue-500" },
            ]);

        } catch (e) {
            console.error("Erreur parsing user data:", e);
            navigate("/espace-pro");
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navigation />
            
            <div className="flex-grow pt-24 pb-10 px-6 container mx-auto max-w-7xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                            Tableau de Bord Client
                        </h1>
                        <p className="text-gray-500">Bienvenue, {user.nomSociete}</p>
                    </div>
                    <Button variant="outline" onClick={() => navigate("/mes-commandes")}>
                        <ShoppingCart className="w-4 h-4 mr-2" /> Voir mes commandes
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {kpis.map(kpi => (
                        <Card key={kpi.title} className="shadow-md border-l-4 border-l-gray-300">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{kpi.value}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Colonne 1: Gestion du Profil et Adresse */}
                    <Card className="shadow-md lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-500" /> Vos Informations
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <p className="font-semibold text-gray-800">{user.nomSociete}</p>
                            <div className="space-y-1">
                                <p className="flex items-center gap-2 text-gray-600">
                                    <FileText className="w-4 h-4 text-gray-400" /> SIRET: {user.siret}
                                </p>
                                <p className="flex items-center gap-2 text-gray-600">
                                    <Mail className="w-4 h-4 text-gray-400" /> Email: {user.email}
                                </p>
                                <p className="flex items-center gap-2 text-gray-600">
                                    <Phone className="w-4 h-4 text-gray-400" /> Tél: {user.phone || 'N/A'}
                                </p>
                            </div>
                            
                            {/* ✅ AFFICHAGE DE L'ADRESSE DU CLIENT */}
                            <div className="pt-2 border-t mt-3">
                                <p className="font-semibold mb-1 flex items-center gap-2 text-gray-800">
                                    <MapPin className="w-4 h-4 text-gray-500" /> Adresse de Facturation
                                </p>
                                <p>{user.address || 'Non renseigné'}</p>
                                <p>{user.zipCity || ''}</p>
                            </div>
                            
                            <Button variant="secondary" className="w-full mt-4">
                                Modifier le Profil
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Colonne 2/3: Statistiques et Liens Rapides */}
                    <Card className="shadow-md lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <LayoutDashboard className="w-5 h-5 text-green-500" /> Statistiques Clés
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-gray-600">
                                Aperçu de votre activité et des délais moyens de production.
                            </p>
                            <Button variant="outline" onClick={() => navigate("/configurateur")} className="w-full">
                                <Glasses className="w-4 h-4 mr-2" /> Ouvrir le configurateur 3D
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DashboardPro;