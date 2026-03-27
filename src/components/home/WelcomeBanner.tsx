import { motion } from "framer-motion";

interface WelcomeBannerProps {
  firstName: string;
}

const WelcomeBanner = ({ firstName }: WelcomeBannerProps) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gradient-primary rounded-lg p-4 shadow-card"
    >
      <h2 className="text-xl font-heading font-bold text-primary-foreground">
        {getGreeting()}, {firstName} ! 👋
      </h2>
      <p className="text-primary-foreground/80 text-sm mt-1">
        Bienvenue sur Paus'études — prêt(e) à apprendre aujourd'hui ?
      </p>
    </motion.div>
  );
};

export default WelcomeBanner;
