import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import './ExplorerWizard.css';

const STORAGE_KEY = 'pcdc-explorer-wizard-dismissed-v1';

function getElements(selectors) {
  const selectorList = Array.isArray(selectors) ? selectors : [selectors];
  return selectorList
    .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
    .filter(Boolean);
}

function getRects(elements) {
  return elements
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map((rect) => ({
      height: rect.height,
      left: rect.left,
      top: rect.top,
      width: rect.width,
    }));
}

function getPopoverPosition(rect) {
  const margin = 20;
  const width = Math.min(760, window.innerWidth - margin * 2);
  const left = Math.min(
    Math.max(margin, rect.left + rect.width / 2 - width / 2),
    window.innerWidth - width - margin,
  );
  const preferBelow = rect.bottom + 250 < window.innerHeight;
  const top = preferBelow
    ? Math.min(rect.bottom + margin, window.innerHeight - 250)
    : Math.max(margin, rect.top - 250);
  const arrowLeft = Math.min(
    Math.max(28, rect.left + rect.width / 2 - left),
    width - 28,
  );

  return {
    arrowLeft,
    arrowPosition: preferBelow ? 'top' : 'bottom',
    left,
    top,
    width,
  };
}

function activateDiseaseTab() {
  const diseaseTab = document.querySelector('[data-tour-filter-tab="Disease"]');
  diseaseTab?.click();
}

const steps = [
  {
    target: '.g3-filter-group__filter-finder',
    text:
      'Use the search box at the top of the Filters panel to quickly find variables of interest. A good starting point is Histology in the Disease tab.',
  },
  {
    target: '[data-tour-filter-tab="Disease"]',
    text:
      'The Disease tab contains clinically useful variables such as Histology. Start here when you are not sure which filter field to use.',
  },
  {
    onEnter: activateDiseaseTab,
    target: [
      '[data-tour-anchor-filter]',
      '[data-tour-filter-section="Age at Tumor Assessment (days)"]',
      '[data-tour-filter-section="Age at Tumor Assessment"]',
    ],
    text:
      'For longitudinal data, choose a Disease Phase with the anchor controls, then use fields such as Age at Tumor Assessment to filter within that phase.',
  },
  {
    target: '.top-bar-menu button[title="Documents"]',
    text:
      'Need help? Open the info icon for the User Guide and related documents. You can also contact pcdc_help@lists.uchicago.edu.',
  },
  {
    target: '[data-tour-compose-button]',
    text:
      'Filter Set Workspace stores your active filters. Compose combines saved filter sets with AND or OR logic. This is most useful after you have saved at least one filter set.',
  },
];

/** @param {{ isOpen: boolean, onClose: () => void }} props */
function ExplorerWizard({ isOpen, onClose }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rects, setRects] = useState([]);
  const [popover, setPopover] = useState(null);
  const step = steps[stepIndex];

  const targetSelectors = useMemo(() => step.target, [step]);

  function closeWizard() {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    onClose();
  }

  function updateLayout(shouldScroll = false) {
    const elements = getElements(targetSelectors);
    const nextRects = getRects(elements);
    setRects(nextRects);

    if (nextRects.length === 0) {
      setPopover({
        arrowLeft: null,
        arrowPosition: null,
        left: Math.max(20, window.innerWidth / 2 - 340),
        top: Math.max(20, window.innerHeight / 2 - 140),
        width: Math.min(760, window.innerWidth - 40),
      });
      return;
    }

    const first = nextRects[0];
    if (shouldScroll)
      elements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    setPopover(getPopoverPosition({
      ...first,
      bottom: first.top + first.height,
    }));
  }

  useEffect(() => {
    if (isOpen) setStepIndex(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    setPopover(null);
    step.onEnter?.();
    const timeout = window.setTimeout(() => updateLayout(true), 120);
    window.addEventListener('resize', updateLayout);
    window.addEventListener('scroll', updateLayout, true);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('scroll', updateLayout, true);
    };
  }, [isOpen, stepIndex]);

  if (!isOpen || popover === null) return null;

  const isLastStep = stepIndex === steps.length - 1;

  return (
    <div className='explorer-wizard' aria-live='polite'>
      <div className='explorer-wizard__overlay' />
      {rects.map((rect, index) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          className='explorer-wizard__highlight'
          style={{
            height: rect.height + 18,
            left: rect.left - 9,
            top: rect.top - 9,
            width: rect.width + 18,
          }}
        />
      ))}
      <section
        className={`explorer-wizard__card${
          popover.arrowPosition
            ? ` explorer-wizard__card--arrow-${popover.arrowPosition}`
            : ''
        }`}
        style={{
          '--explorer-wizard-arrow-left': popover.arrowLeft === null
            ? undefined
            : `${popover.arrowLeft}px`,
          left: popover.left,
          top: popover.top,
          width: popover.width,
        }}
      >
        <button
          aria-label='Close guide'
          className='explorer-wizard__close'
          onClick={closeWizard}
          type='button'
        />
        <p>{step.text}</p>
        <footer>
          <button
            className='explorer-wizard__skip'
            onClick={closeWizard}
            type='button'
          >
            Skip
          </button>
          <div className='explorer-wizard__actions'>
            {stepIndex > 0 && (
              <button
                className='explorer-wizard__back'
                onClick={() => setStepIndex((i) => i - 1)}
                type='button'
              >
                Back
              </button>
            )}
            <button
              className='explorer-wizard__next'
              onClick={() =>
                isLastStep ? closeWizard() : setStepIndex((i) => i + 1)
              }
              type='button'
            >
              {isLastStep
                ? 'Done'
                : `Next (Step ${stepIndex + 1} of ${steps.length})`}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

ExplorerWizard.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

ExplorerWizard.STORAGE_KEY = STORAGE_KEY;

export default ExplorerWizard;
