(function () {
  const container = document.querySelector('.scroll-container');
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');
  const animElements = document.querySelectorAll('.anim');
  const audioControls = document.getElementById('audio-controls');
  const audioToggle = document.getElementById('audio-toggle');
  const volumeSlider = document.getElementById('volume-slider');

  let currentSlide = 0;
  let audioEnabled = false;
  let ambientController = null;
  let roomControllers = {};
  let currentVolume = 70; // 0-100
  let activeSource = null; // 'ambient' | room index

  const SVG_OFF =
    '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>' +
    '<line x1="23" y1="9" x2="17" y2="15"></line>' +
    '<line x1="17" y1="9" x2="23" y2="15"></line>';

  const SVG_ON =
    '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>' +
    '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>' +
    '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>';

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
            handleAudio(index);
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

  // ===== Audio Toggle =====
  audioToggle.addEventListener('click', () => {
    audioEnabled = !audioEnabled;

    if (audioEnabled) {
      audioToggle.querySelector('svg').innerHTML = SVG_ON;
      audioControls.classList.add('active');
      handleAudio(currentSlide);
    } else {
      audioToggle.querySelector('svg').innerHTML = SVG_OFF;
      audioControls.classList.remove('active');
      pauseAll();
      activeSource = null;
    }
  });

  // ===== Volume =====
  volumeSlider.addEventListener('input', () => {
    currentVolume = parseInt(volumeSlider.value, 10);
    // Spotify IFrame API doesn't expose volume control directly,
    // so we control the iframe element's volume via postMessage workaround.
    // For now the slider controls a CSS visual state — actual volume
    // is handled at the Spotify player level by the user.
    // If volume is 0, mute by pausing.
    if (currentVolume === 0 && audioEnabled) {
      pauseAll();
    } else if (currentVolume > 0 && audioEnabled) {
      handleAudio(currentSlide);
    }
  });

  // ===== Collect room slides =====
  const roomSlides = {};
  document.querySelectorAll('.slide-room').forEach((slide) => {
    const index = parseInt(slide.dataset.index, 10);
    const trackId = slide.dataset.spotifyTrack;
    if (trackId) {
      roomSlides[index] = {
        trackId: trackId,
        embedId: slide.querySelector('.spotify-embed')?.id,
        controller: null
      };
    }
  });

  // ===== Spotify IFrame API =====
  window.onSpotifyIframeApiReady = (IFrameAPI) => {
    // Create ambient player
    const ambientEl = document.getElementById('spotify-ambient');
    const ambientTrack = ambientEl?.dataset.spotifyTrack;
    if (ambientEl && ambientTrack) {
      IFrameAPI.createController(ambientEl, {
        uri: 'spotify:track:' + ambientTrack,
        width: 300,
        height: 80,
        theme: 'dark'
      }, (controller) => {
        ambientController = controller;
        controller.addListener('ready', () => {
          controller.pause();
        });
      });
    }

    // Create room players
    Object.entries(roomSlides).forEach(([index, room]) => {
      if (!room.trackId || !room.embedId) return;
      const element = document.getElementById(room.embedId);
      if (!element) return;

      IFrameAPI.createController(element, {
        uri: 'spotify:track:' + room.trackId,
        width: 300,
        height: 80,
        theme: 'dark'
      }, (controller) => {
        room.controller = controller;
        roomControllers[index] = controller;
        controller.addListener('ready', () => {
          controller.pause();
        });
      });
    });
  };

  // ===== Audio Logic =====
  function pauseAll() {
    if (ambientController) {
      try { ambientController.pause(); } catch (e) {}
    }
    Object.values(roomControllers).forEach((ctrl) => {
      try { ctrl.pause(); } catch (e) {}
    });
  }

  function handleAudio(slideIndex) {
    if (!audioEnabled || currentVolume === 0) return;

    const isRoom = roomSlides[slideIndex] && roomSlides[slideIndex].controller;

    if (isRoom) {
      // On a room slide — play room track, pause ambient
      if (activeSource !== slideIndex) {
        pauseAll();
        try { roomSlides[slideIndex].controller.resume(); } catch (e) {}
        activeSource = slideIndex;
      }
    } else {
      // On a non-room slide — play ambient, pause rooms
      if (activeSource !== 'ambient') {
        pauseAll();
        if (ambientController) {
          try { ambientController.resume(); } catch (e) {}
        }
        activeSource = 'ambient';
      }
    }
  }

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

  // ===== First slide visible immediately =====
  const firstAnim = slides[0]?.querySelector('.anim');
  if (firstAnim) firstAnim.classList.add('visible');
})();
