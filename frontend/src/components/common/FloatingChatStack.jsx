import { useRef, useState } from 'react';
import AISalesAdvisor from '../ai/AISalesAdvisor.jsx';
import SupportLauncher from '../support/SupportLauncher.jsx';

export default function FloatingChatStack() {
  const [activePanel, setActivePanel] = useState(null);
  const supportLauncherRef = useRef(null);

  const setPanelOpen = (panel) => (isOpen) => {
    setActivePanel(isOpen ? panel : null);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[96] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <AISalesAdvisor
        open={activePanel === 'advisor'}
        onOpenChange={setPanelOpen('advisor')}
      />
      <SupportLauncher
        open={activePanel === 'support'}
        onOpenChange={setPanelOpen('support')}
        launcherRef={supportLauncherRef}
      />
    </div>
  );
}
