import { useMemo } from "react";
import { DAILY_MOTIVATIONS } from "@/lib/constants";

interface WelcomeBannerProps {
  firstName: string;
}

const WelcomeBanner = ({ firstName }: WelcomeBannerProps) => {
  const dailyMotivation = useMemo(() => {
    const today = new Date();
    const dayOfMonth = today.getDate();
    return DAILY_MOTIVATIONS[(dayOfMonth - 1) % DAILY_MOTIVATIONS.length];
  }, []);

  return (
    <div className="text-center space-y-1">
      <h2 className="text-xl font-heading font-bold text-primary">
        Bienvenue, {firstName} !
      </h2>
      <p className="text-sm text-muted-foreground italic">
        {dailyMotivation}
      </p>
    </div>
  );
};

export default WelcomeBanner;
