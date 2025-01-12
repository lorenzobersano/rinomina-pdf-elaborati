import { useState } from "react";
import { useWindowSize } from "react-use";
import Confetti from "react-confetti";

declare global {
  interface Window {
    electron: {
      selectDirs: VoidFunction;
      selectDirsCb: (value: any) => any;
    };
  }
}

export function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldShowConfetti, setShouldShowConfetti] = useState(false);
  const { width, height } = useWindowSize();

  function triggerSelectDirs() {
    setIsProcessing(true);
    window.electron.selectDirs();
  }

  window.electron.selectDirsCb((value) => {
    if (isProcessing) {
      if (value === "OK") {
        alert("Andataaaa");
        setShouldShowConfetti(true);

        setTimeout(() => setShouldShowConfetti(false), 5000);
      }
      setIsProcessing(false);
    }
  });

  return (
    <>
      {shouldShowConfetti && <Confetti width={width} height={height} />}
      <div className=" font-sans min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl">Rinomina PDF elaborati</h1>
          <button className="px-4 py-2 border-2" onClick={triggerSelectDirs}>
            {isProcessing
              ? "Aspett nu minut"
              : "Seleziona la cartella porfi 🙏"}
          </button>
        </div>
      </div>
    </>
  );
}
