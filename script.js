(function () {
  const container = document.querySelector('.scroll-container');
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');
  const animElements = document.querySelectorAll('.anim');
  const audioBtn = document.getElementById('audio-enable');

  let currentSlide = 0;
  let audioEnabled = false;
  let spotifyControllers = {};
  let activeRoomIndex = null;

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

  // ===== Audio Enable Button =====
  audioBtn.addEventListener('click', () => {
    audioEnabled = true;
    audioBtn.classList.add('enabled');
    // Change icon to speaker on
    audioBtn.querySelector('svg').innerHTML =
      '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>' +
      '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>' +
      '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>';
    audioBtn.querySelector('span').textContent = 'Audio On';

    // Auto-fade out after 2s
    setTimeout(() => {
      audioBtn.classList.add('hidden');
    }, 2000);

    // If already on a room slide, start playing
    handleRoomAudio(currentSlide);
  });

  // ===== Spotify IFrame API =====
  // Collect room slides and their track IDs
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

  // Initialize Spotify embeds when API is ready
  window.onSpotifyIframeApiReady = (IFrameAPI) => {
    Object.entries(roomSlides).forEach(([index, room]) => {
      if (!room.trackId || !room.embedId) return;

      const element = document.getElementById(room.embedId);
      if (!element) return;

      const options = {
        uri: 'spotify:track:' + room.trackId,
        width: '100%',
        height: 80,
        theme: 'dark'
      };

      IFrameAPI.createController(element, options, (controller) => {
        room.controller = controller;
        spotifyControllers[index] = controller;

        // Pause immediately — we only play when the room is active
        controller.addListener('ready', () => {
          controller.pause();
        });
      });
    });
  };

  // ===== Handle Room Audio on Scroll =====
  function handleRoomAudio(slideIndex) {
    if (!audioEnabled) return;

    const roomData = roomSlides[slideIndex];

    // Pause all controllers first
    Object.entries(spotifyControllers).forEach(([idx, ctrl]) => {
      if (parseInt(idx) !== slideIndex) {
        try { ctrl.pause(); } catch (e) {}
      }
    });

    // Play current room's track
    if (roomData && roomData.controller) {
      try { roomData.controller.resume(); } catch (e) {}
      activeRoomIndex = slideIndex;
    } else {
      activeRoomIndex = null;
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
