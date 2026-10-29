import Navigation from "@/components/Navigation";
import HomeHero from "@/components/home/HomeHero";
import HomeCollection from "@/components/home/HomeCollection";
import HomeSavoirFaire from "@/components/home/HomeSavoirFaire";
import CustomLenses from "@/components/CustomLenses";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <HomeHero />
      <HomeCollection />
      <HomeSavoirFaire />
      <CustomLenses />
      <Contact />
      <Footer />
    </div>
  );
};

export default Index;
