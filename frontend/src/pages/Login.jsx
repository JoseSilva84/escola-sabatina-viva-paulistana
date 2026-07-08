import React from "react";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { BookOpenCheck, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { usuario, entrar } = useAuth();
  const [email, setEmail] = useState("professor@nota10.com");
  const [senha, setSenha] = useState("123456");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  if (usuario) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    try {
      await entrar(email, senha);
    } catch {
      toast.error("Nao consegui entrar com esses dados.", {
        description: "Confira o e-mail e a senha e tente novamente."
      });
    }
  }

  const containerVariants = {
    hidden: {
      opacity: 0,
      scale: 0.9,
      filter: "blur(10px)"
    },
    visible: {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        duration: 0.4,
        ease: "easeOut",
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const shardVariants = {
    hidden: (custom) => ({
      opacity: 0,
      x: custom.x,
      y: custom.y,
      rotate: custom.rotate,
      scale: 0.2,
      filter: "blur(10px)"
    }),
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 100,
        mass: 0.8
      }
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center p-6 overflow-hidden bg-[#eef2f7]">
      <div className="absolute inset-0 overflow-hidden z-0">
        <motion.div
          className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-[#60a5fa]/80 to-[#3b82f6]/20 blur-[80px]"
          animate={{ x: [0, 250, 0], y: [0, 150, 0], scale: [1, 1.3, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-[10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-[#facc15]/80 to-[#f59e0b]/20 blur-[90px]"
          animate={{ x: [0, -300, 0], y: [0, 200, 0], scale: [1, 1.4, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-20%] left-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-[#3b82f6]/70 to-[#102d55]/20 blur-[100px]"
          animate={{ x: [0, 200, 0], y: [0, -250, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-white/10 bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      <motion.section
        className="relative z-10 w-full max-w-[440px] p-8 md:p-9 rounded-2xl text-white bg-gradient-to-br from-[#173a6a]/95 to-[#0d2444]/95 backdrop-blur-xl border border-white/10 shadow-[0_30px_80px_rgba(10,31,59,0.3)]"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={shardVariants}
          custom={{ x: -100, y: -100, rotate: -45 }}
          className="flex items-center gap-3 font-bold text-[22px] leading-[1.1] tracking-tight text-center justify-center"
        >
          <BookOpenCheck size={34} className="text-[#f4c21f]" />
          <span>ESCOLA SABATINA VIVA</span>
        </motion.div>

        <motion.h1
          variants={shardVariants}
          custom={{ x: 100, y: -80, rotate: 45 }}
          className="mt-7 text-3xl font-outfit tracking-tight text-center"
        >
          Entre no painel
        </motion.h1>

        <form onSubmit={submit} className="grid gap-3.5 mt-6">
          <motion.label
            variants={shardVariants}
            custom={{ x: -150, y: 50, rotate: -30 }}
            className="grid gap-2 font-bold text-center"
          >
            E-mail
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              className="min-h-[46px] px-3.5 border border-white/20 rounded-lg text-white bg-white/10 outline-none focus:border-[#f4c21f] transition-colors text-center"
            />
          </motion.label>

          <motion.label
            variants={shardVariants}
            custom={{ x: 150, y: 80, rotate: 30 }}
            className="grid gap-2 font-bold text-center"
          >
            Senha
            <div className="relative flex items-center w-full">
              <input
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                type={mostrarSenha ? "text" : "password"}
                className="w-full min-h-[46px] px-3.5 pr-10 border border-white/20 rounded-lg text-white bg-white/10 outline-none focus:border-[#f4c21f] transition-colors text-center"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 text-white/60 hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 outline-none"
                tabIndex="-1"
              >
                {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </motion.label>

          <motion.button
            variants={shardVariants}
            custom={{ x: 0, y: 150, rotate: -15 }}
            type="submit"
            className="group inline-flex items-center justify-center gap-2 mt-2 min-h-[46px] px-4 rounded-lg border-0 bg-[#f4c21f] text-[#10223d] font-extrabold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 active:translate-y-px active:scale-95"
          >
            Entrar
          </motion.button>
        </form>
      </motion.section>
    </main>
  );
}
