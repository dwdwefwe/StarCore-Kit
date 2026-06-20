import { AnimatePresence, motion } from "framer-motion";
import DeviceDashboard from "../../pages/DeviceDashboard";
import RootWizard from "../../pages/RootWizard";
import ToolGrid from "../../pages/ToolGrid";
import AdvancedConsole from "../../pages/AdvancedConsole";
import SettingsPage from "../../pages/SettingsPage";
import EDLRescue from "../../pages/EDLRescue";
import FastbootRescue from "../../pages/FastbootRescue";

const pageVariants = {
  initial: { opacity: 0, scale: 0.96, filter: "blur(4px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.96, filter: "blur(4px)" },
};

interface Props {
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function MainContent({ activePage, onNavigate }: Props) {
  return (
    <main className="flex-1 overflow-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={activePage}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          {activePage === "dashboard" && <DeviceDashboard />}
          {activePage === "root" && <RootWizard />}
          {activePage === "tools" && <ToolGrid onNavigate={onNavigate} />}
          {activePage === "console" && <AdvancedConsole />}
          {activePage === "settings" && <SettingsPage />}
          {activePage === "edl_rescue" && <EDLRescue />}
          {activePage === "fastboot_rescue" && <FastbootRescue />}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
