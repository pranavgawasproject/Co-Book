import React from 'react';
import { createRoot } from 'react-dom/client';
import Hero from './Hero';
import tailwindStyles from './index.css?inline';

// 1. Initial Injection Check
if (!document.getElementById('splitsync-extension-root')) {
  
  // 2. Create Host and Shadow DOM
  const host = document.createElement('div');
  host.id = 'splitsync-extension-root';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // 3. Inject Styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = tailwindStyles;
  shadow.appendChild(styleSheet);

  // 4. Create React Mount
  const renderRoot = document.createElement('div');
  renderRoot.id = 'splitsync-react-root';
  shadow.appendChild(renderRoot);

  const root = createRoot(renderRoot);
  root.render(<Hero />);
  
  console.log('[SplitSync] Multiplayer UI Locked & Loaded via Shadow DOM');

  // 5. native Checkout Hijack
  // Intercepting clicks at the capture phase to block the host site's native checkout sequence
  document.body.addEventListener('click', (e) => {
     if (!e.target || typeof e.target.closest !== 'function') return;
     // Airbnb's Reserve button or Confirm button tests
     const checkoutBtn = e.target.closest("button[data-testid='homes-pdp-cta-btn'], button[data-testid='quick-pay-button']");
     
     if (checkoutBtn) {
        // Here we could check if a session is active and fully funded
        // For MVP, if they click it, we warn them to use SplitSync instead and stop the event
        e.preventDefault();
        e.stopPropagation();
        
        // Optional: Dispatch custom event to tell React to open/highlight the Hero component
        const event = new CustomEvent('splitsync-checkout-intercepted');
        window.dispatchEvent(event);

        console.log('[SplitSync] Intercepted native checkout. Group must be fully funded to proceed.');
        // In a full build, we would disable the underlying button and change its text to "Locked by SplitSync"
        checkoutBtn.style.opacity = '0.5';
        checkoutBtn.style.cursor = 'not-allowed';
     }
  }, true);
}

