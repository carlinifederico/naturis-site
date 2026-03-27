(function () {
  const container = document.querySelector('.scroll-container');
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');
  const animElements = document.querySelectorAll('.anim');
  const audioControls = document.getElementById('audio-controls');
  const audioToggle = document.getElementById('audio-toggle');
  const volumeSlider = document.getElementById('volume-slider');

  // ===== Audio Setup =====
  const FADE_MS = 800;
  let audioEnabled = true; // ON by default
  let currentVolume = 0.7;
  let currentSlide = 0;
  let activeAudio = null;
  let userInteracted = false;

  const SVG_OFF =
    '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>' +
    '<line x1="23" y1="9" x2="17" y2="15"></line>' +
    '<line x1="17" y1="9" x2="23" y2="15"></line>';

  const SVG_ON =
    '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>' +
    '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>' +
    '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>';

  // Map slide indices to audio elements
  const audioAmbient = document.getElementById('audio-ambient');
  const roomAudioMap = {
    5: document.getElementById('audio-room-1'),
    6: document.getElementById('audio-room-2'),
    7: document.getElementById('audio-room-3'),
    8: document.getElementById('audio-room-4'),
    9: document.getElementById('audio-room-5'),
    10: document.getElementById('audio-room-6'),
  };

  const allAudios = [audioAmbient, ...Object.values(roomAudioMap)];

  // Set initial volume on all audio elements
  allAudios.forEach((a) => { a.volume = 0; });

  // Show active state by default
  audioControls.classList.add('active');

  // ===== Crossfade =====
  function fadeOut(audio, duration) {
    if (!audio || audio.paused) return Promise.resolve();
    const startVol = audio.volume;
    const steps = 20;
    const stepTime = duration / steps;
    const volStep = startVol / steps;
    return new Promise((resolve) => {
      let step = 0;
      const interval = setInterval(() => {
        step++;
        audio.volume = Math.max(0, startVol - volStep * step);
        if (step >= steps) {
          clearInterval(interval);
          audio.pause();
          audio.volume = 0;
          resolve();
        }
      }, stepTime);
    });
  }

  function fadeIn(audio, targetVol, duration) {
    if (!audio) return;
    audio.volume = 0;
    audio.play().catch(() => {});
    const steps = 20;
    const stepTime = duration / steps;
    const volStep = targetVol / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      audio.volume = Math.min(targetVol, volStep * step);
      if (step >= steps) {
        clearInterval(interval);
        audio.volume = targetVol;
      }
    }, stepTime);
  }

  // ===== Play correct track for slide =====
  function playForSlide(slideIndex) {
    if (!audioEnabled || !userInteracted) return;

    const targetAudio = roomAudioMap[slideIndex] || audioAmbient;

    if (targetAudio === activeAudio) return;

    // Fade out current
    if (activeAudio && !activeAudio.paused) {
      fadeOut(activeAudio, FADE_MS);
    }

    // Fade in new
    fadeIn(targetAudio, currentVolume, FADE_MS);
    activeAudio = targetAudio;
  }

  function stopAll() {
    allAudios.forEach((a) => {
      a.pause();
      a.volume = 0;
    });
    activeAudio = null;
  }

  // ===== Start audio on first user interaction =====
  function onFirstInteraction() {
    if (userInteracted) return;
    userInteracted = true;
    if (audioEnabled) {
      playForSlide(currentSlide);
    }
    document.removeEventListener('click', onFirstInteraction);
    document.removeEventListener('keydown', onFirstInteraction);
    document.removeEventListener('scroll', onFirstInteraction, true);
  }
  document.addEventListener('click', onFirstInteraction);
  document.addEventListener('keydown', onFirstInteraction);
  document.addEventListener('scroll', onFirstInteraction, true);

  // ===== Audio Toggle =====
  audioToggle.addEventListener('click', () => {
    audioEnabled = !audioEnabled;

    if (audioEnabled) {
      audioToggle.querySelector('svg').innerHTML = SVG_ON;
      audioControls.classList.add('active');
      playForSlide(currentSlide);
    } else {
      audioToggle.querySelector('svg').innerHTML = SVG_OFF;
      audioControls.classList.remove('active');
      stopAll();
    }
  });

  // ===== Volume Slider =====
  volumeSlider.addEventListener('input', () => {
    currentVolume = parseInt(volumeSlider.value, 10) / 100;
    if (activeAudio && !activeAudio.paused) {
      activeAudio.volume = currentVolume;
    }
  });

  // ===== Intersection Observer: Animations =====
  const animObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    },
    { root: container, threshold: 0.25 }
  );
  animElements.forEach((el) => animObserver.observe(el));

  // ===== Intersection Observer: Active Slide =====
  const slideObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          const index = parseInt(entry.target.dataset.index, 10);
          if (index !== currentSlide) {
            currentSlide = index;
            updateDots(index);
            playForSlide(index);
          }
        }
      });
    },
    { root: container, threshold: 0.55 }
  );
  slides.forEach((slide) => slideObserver.observe(slide));

  // ===== Dots =====
  function updateDots(activeIndex) {
    dots.forEach((dot) => {
      dot.classList.toggle('active', parseInt(dot.dataset.slide, 10) === activeIndex);
    });
  }

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const target = slides[parseInt(dot.dataset.slide, 10)];
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // ===== Keyboard =====
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      slides[Math.min(currentSlide + 1, slides.length - 1)].scrollIntoView({ behavior: 'smooth' });
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      slides[Math.max(currentSlide - 1, 0)].scrollIntoView({ behavior: 'smooth' });
    }
  });

  // ===== Video Support =====
  document.querySelectorAll('.room-video[data-video-src]').forEach((videoWrap) => {
    const src = videoWrap.dataset.videoSrc;
    if (!src) return;
    const video = videoWrap.querySelector('video');
    const slide = videoWrap.closest('.slide');
    const bgImg = slide.querySelector('.slide-bg img');
    video.src = src;
    videoWrap.style.display = 'block';
    video.addEventListener('loadeddata', () => {
      if (bgImg) bgImg.style.display = 'none';
    });
  });

  // ===== Lightbox =====
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');

  document.querySelectorAll('.room-thumb-wrap').forEach((wrap) => {
    wrap.addEventListener('click', () => {
      const img = wrap.querySelector('img');
      if (!img) return;
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightbox.classList.add('open');
    });
  });

  function closeLightbox() {
    lightbox.classList.remove('open');
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
  });

  // ===== First slide visible immediately =====
  const firstAnim = slides[0]?.querySelector('.anim');
  if (firstAnim) firstAnim.classList.add('visible');
})();
