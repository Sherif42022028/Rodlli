(function() {
  // 1. Locate the widget script element
  var scriptEl = document.currentScript || document.querySelector('script[data-merchant]');
  if (!scriptEl) {
    console.error('Rodlli Widget script tag not found.');
    return;
  }

  // 2. Extract configuration attributes
  var merchantSlug = scriptEl.getAttribute('data-merchant');
  var themeColor = scriptEl.getAttribute('data-color') || '#F26B1D';
  var position = scriptEl.getAttribute('data-position') || 'bottom-right';

  if (!merchantSlug) {
    console.error('Rodlli Widget: data-merchant slug is missing.');
    return;
  }

  // Determine platform origin from script src
  var scriptSrc = scriptEl.src;
  var platformOrigin = '';
  try {
    var url = new URL(scriptSrc);
    platformOrigin = url.origin;
  } catch (e) {
    platformOrigin = window.location.origin; // fallback
  }

  // 3. Inject CSS Styles for Bubble and Container
  var styles = document.createElement('style');
  styles.innerHTML = `
    .rodlli-widget-container {
      position: fixed;
      bottom: 90px;
      width: 380px;
      height: 600px;
      max-height: 80vh;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.16);
      border-radius: 20px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      overflow: hidden;
      z-index: 999999;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      background-color: #fff;
    }
    .rodlli-widget-container.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    .rodlli-widget-bubble {
      position: fixed;
      bottom: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease-in-out;
      background-color: ${themeColor};
    }
    .rodlli-widget-bubble:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }
    .rodlli-widget-bubble svg {
      width: 28px;
      height: 28px;
      fill: #ffffff;
      transition: transform 0.2s ease-in-out;
    }
    .rodlli-widget-bubble.open svg {
      transform: rotate(90deg);
    }
    
    /* Position Classes */
    .rodlli-pos-right {
      right: 24px;
    }
    .rodlli-pos-left {
      left: 24px;
    }

    /* Mobile Responsive styling */
    @media (max-width: 640px) {
      .rodlli-widget-container {
        width: 100% !important;
        height: 100% !important;
        max-height: 100vh !important;
        bottom: 0 !important;
        right: 0 !important;
        left: 0 !important;
        border-radius: 0 !important;
        border: none !important;
      }
      .rodlli-widget-container.open {
        transform: none !important;
      }
      .rodlli-widget-bubble.open {
        bottom: auto !important;
        top: 12px !important;
        width: 44px !important;
        height: 44px !important;
        box-shadow: none !important;
        background-color: transparent !important;
      }
      .rodlli-widget-bubble.open.rodlli-pos-right {
        right: 12px !important;
      }
      .rodlli-widget-bubble.open.rodlli-pos-left {
        left: 12px !important;
      }
      .rodlli-widget-bubble.open svg {
        fill: #333333 !important;
      }
    }
  `;
  document.head.appendChild(styles);

  // 4. Create Iframe Container
  var container = document.createElement('div');
  container.className = 'rodlli-widget-container ' + (position === 'left' ? 'rodlli-pos-left' : 'rodlli-pos-right');

  var iframe = document.createElement('iframe');
  iframe.src = platformOrigin + '/widget-frame/' + merchantSlug;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.outline = 'none';
  container.appendChild(iframe);
  document.body.appendChild(container);

  // 5. Create Bubble Trigger Button
  var bubble = document.createElement('div');
  bubble.className = 'rodlli-widget-bubble ' + (position === 'left' ? 'rodlli-pos-left' : 'rodlli-pos-right');
  
  // Default Chat Icon SVG
  var chatIcon = `
    <svg viewBox="0 0 24 24">
      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
    </svg>
  `;
  // Close Icon SVG
  var closeIcon = `
    <svg viewBox="0 0 24 24">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  `;

  bubble.innerHTML = chatIcon;
  document.body.appendChild(bubble);

  // 6. Handle Toggle click
  var isOpen = false;
  bubble.addEventListener('click', function() {
    isOpen = !isOpen;
    if (isOpen) {
      container.classList.add('open');
      bubble.classList.add('open');
      bubble.innerHTML = closeIcon;
    } else {
      container.classList.remove('open');
      bubble.classList.remove('open');
      bubble.innerHTML = chatIcon;
    }
  });

  // 7. Communication Bridge (postMessage)
  window.addEventListener('message', function(event) {
    if (event.origin !== platformOrigin) return;
    
    // Close widget frame if triggered internally
    if (event.data === 'rodlli_close_widget') {
      isOpen = false;
      container.classList.remove('open');
      bubble.classList.remove('open');
      bubble.innerHTML = chatIcon;
    }
  });
})();
