import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AISalesAdvisor from '../ai/AISalesAdvisor.jsx';
import { getAdvisorCurrentProductId } from '../ai/aiAdvisorUi.js';
import SupportLauncher from '../support/SupportLauncher.jsx';

export default function FloatingChatStack() {
  const [activePanel, setActivePanel] = useState(null);
  const supportLauncherRef = useRef(null);
  const location = useLocation();
  const currentProductId = getAdvisorCurrentProductId(location.pathname);

  const setPanelOpen = (panel) => (isOpen) => {
    setActivePanel(isOpen ? panel : null);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[96] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <AISalesAdvisor
        open={activePanel === 'advisor'}
        onOpenChange={setPanelOpen('advisor')}
        currentProductId={currentProductId ?? undefined}
      />
      <SupportLauncher
        open={activePanel === 'support'}
        onOpenChange={setPanelOpen('support')}
        launcherRef={supportLauncherRef}
      />
    </div>
  );
}
