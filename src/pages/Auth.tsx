import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center mb-6"
      >
        <div className="overflow-hidden h-[60px] w-20 mx-auto">
          <img src={logo} alt="Paus'étude" width={80} height={80} className="w-20 h-20 object-contain object-top" />
        </div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Paus'étude</h1>
        <p className="text-sm text-muted-foreground">Votre assistant scolaire</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-full max-w-md bg-card rounded-lg shadow-elevated p-6"
      >
        <div className="flex mb-6 bg-secondary rounded-md p-1">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              isLogin
                ? "bg-gradient-primary text-primary-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              !isLogin
                ? "bg-gradient-primary text-primary-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Inscription
          </button>
        </div>

        <AnimatePresence mode="wait">
          {isLogin ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
            </motion.div>
          ) : (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Auth;
