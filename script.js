(function () {
  const container = document.querySelector('.scroll-container');
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');
  const animElements = document.querySelectorAll('.anim');
  const audioBtn = document.getElementById('audio-enable');

  let currentSlide = 0;
  let audioEnabled = false;
  let spotifyControllers = {};

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
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
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
            handleRoomAudio(index);
          }
        }
      });
    },
    { root: container, threshold: 0.55 }
  );

  slides.forEach((slide) => slideObserver.observe(slide));

  // ===== Update Dots =====
  function updateDots(activeIndex) {
    dots.forEach((dot) => {
      dot.classList.toggle('active', parseInt(dot.dataset.slide, 10) === activeIndex);
    });
  }

  // ===== Dot Click Navigation =====
  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const index = parseInt(dot.dataset.slide, 10);
      const target = slides[index];
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // ===== Keyboard Navigation =====
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = Math.min(currentSlide + 1, slides.length - 1);
      slides[next].scrollIntoView({ behavior: 'smooth' });
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = Math.max(currentSlide - 1, 0);
      slides[prev].scrollIntoView({ behavior: 'smooth' });
    }
  });

  // ===== Audio Toggle Button =====
  audioBtn.addEventListener('click', () => {
    audioEnabled = !audioEnabled;

    if (audioEnabled) {
      audioBtn.querySelector('svg').innerHTML = SVG_ON;
      audioBtn.querySelector('span').textContent = 'Audio On';
      audioBtn.classList.add('enabled');
      handleRoomAudio(currentSlide);
    } else {
      audioBtn.querySelector('svg').innerHTML = SVG_OFF;
      audioBtn.querySelector('span').textContent = 'Enable Audio';
      audioBtn.classList.remove('enabled', 'playing');
      pauseAll();
    }
  });

  // ===== Spotify IFrame API =====
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

  window.onSpotifyIframeApiReady = (IFrameAPI) => {
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
        spotifyControllers[index] = controller;
        controller.addListener('ready', () => {
          controller.pause();
        });
      });
    });
  };

  // ===== Handle Room Audio on Scroll =====
  function pauseAll() {
    Object.values(spotifyControllers).forEach((ctrl) => {
      try { ctrl.pause(); } catch (e) {}
    });
  }

  function handleRoomAudio(slideIndex) {
    const isRoom = roomSlides[slideIndex] && roomSlides[slideIndex].controller;

    if (!audioEnabled) {
      audioBtn.classList.remove('playing');
      return;
    }

    // Pause all first
    pauseAll();

    // Play current room's track if on a room
    if (isRoom) {
      try {
        roomSlides[slideIndex].controller.resume();
        audioBtn.classList.add('playing');
      } catch (e) {}
    } else {
      audioBtn.classList.remove('playing');
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
  if (firstAnim) {
    firstAnim.classList.add('visible');
  }
})();
