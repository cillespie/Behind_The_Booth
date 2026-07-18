/* ==========================================================================
   Behind The Booth Entertainment LLC - Premium JavaScript Controller
   Interactions: Sticky Navbar, Mobile Navigation, Scroll Reveals,
                 Gear Accordion, Testimonials Carousel, 3D Card Hover Tilts,
                 & Form Handlers.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. STICKY GLASS NAVIGATION BAR
    // ==========================================
    const mainHeader = document.getElementById('mainHeader');
    const scrollThreshold = 50;

    const handleNavbarScroll = () => {
        if (window.scrollY > scrollThreshold) {
            mainHeader.classList.add('scrolled');
        } else {
            mainHeader.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', handleNavbarScroll, { passive: true });
    // Initial check in case page is loaded scrolled down
    handleNavbarScroll();


    // ==========================================
    // 2. MOBILE NAVIGATION SLIDE-OUT MENU
    // ==========================================
    const mobileNavToggle = document.getElementById('mobileNavToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileLinks = document.querySelectorAll('.mobile-link');

    const toggleMobileMenu = () => {
        mobileNavToggle.classList.toggle('open');
        mobileMenu.classList.toggle('open');
        // Prevent body scrolling when menu is open
        document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    };

    mobileNavToggle.addEventListener('click', toggleMobileMenu);

    // Auto-close menu when any mobile link is clicked
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mobileMenu.classList.contains('open')) {
                toggleMobileMenu();
            }
        });
    });


    // ==========================================
    // 3. SCROLL-DRIVEN ENTRANCE REVEAL (IntersectionObserver)
    // ==========================================
    const revealElements = document.querySelectorAll('.scroll-reveal');

    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Once triggered, stop observing this element
                observer.unobserve(entry.target);
            }
        });
    };

    const revealObserverOption = {
        root: null, // viewport
        threshold: 0.01, // trigger as soon as 1% is visible (crucial for tall stacked mobile sections)
        rootMargin: '0px 0px -10px 0px' // organic trigger just before entering screen
    };

    const revealObserver = new IntersectionObserver(revealCallback, revealObserverOption);

    revealElements.forEach(element => {
        revealObserver.observe(element);
    });


    // ==========================================
    // 4. GEAR & PRODUCTION DETAILS ACCORDION
    // ==========================================
    const accordionItems = document.querySelectorAll('.gear-details-accordion .accordion-item');

    accordionItems.forEach(item => {
        const trigger = item.querySelector('.accordion-trigger');
        
        trigger.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all items
            accordionItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });
            
            // If the clicked item wasn't active, open it
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });


    // ==========================================
    // 5. TESTIMONIALS SLIDER CAROUSEL
    // ==========================================
    const carouselTrack = document.getElementById('carouselTrack');
    if (carouselTrack) {
        const slides = Array.from(document.querySelectorAll('.carousel-slide'));
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const dotsContainer = document.getElementById('carouselDots');
        const dots = Array.from(dotsContainer.querySelectorAll('.carousel-dot'));
        
        let currentSlideIndex = 0;
        let slideInterval;
        const autoSlideDelay = 6000; // 6 seconds

        const updateCarouselState = () => {
            // Toggle active slide
            slides.forEach((slide, index) => {
                if (index === currentSlideIndex) {
                    slide.classList.add('active');
                } else {
                    slide.classList.remove('active');
                }
            });

            // Toggle active dot
            dots.forEach((dot, index) => {
                if (index === currentSlideIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        };

        const moveToSlide = (index) => {
            currentSlideIndex = index;
            updateCarouselState();
            resetAutoSlide();
        };

        const nextSlide = () => {
            let nextIndex = currentSlideIndex + 1;
            if (nextIndex >= slides.length) {
                nextIndex = 0;
            }
            moveToSlide(nextIndex);
        };

        const prevSlide = () => {
            let prevIndex = currentSlideIndex - 1;
            if (prevIndex < 0) {
                prevIndex = slides.length - 1;
            }
            moveToSlide(prevIndex);
        };

        // Click controls
        if (nextBtn) nextBtn.addEventListener('click', nextSlide);
        if (prevBtn) prevBtn.addEventListener('click', prevSlide);

        // Dot controls
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                moveToSlide(index);
            });
        });

        // Auto sliding cycle
        const startAutoSlide = () => {
            slideInterval = setInterval(nextSlide, autoSlideDelay);
        };

        const resetAutoSlide = () => {
            clearInterval(slideInterval);
            startAutoSlide();
        };

        // Initialize auto-sliding
        startAutoSlide();

        // Pause on hover
        const carouselContainer = document.querySelector('.carousel-container');
        if (carouselContainer) {
            carouselContainer.addEventListener('mouseenter', () => clearInterval(slideInterval));
            carouselContainer.addEventListener('mouseleave', startAutoSlide);
        }
    }


    // ==========================================
    // 6. DYNAMIC 3D CARD HOVER TILT EFFECTS
    // ==========================================
    const tiltCards = document.querySelectorAll('.service-card, .premium-image-frame');

    tiltCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            
            // Mouse coordinates relative to card
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Normalize to ranges of -0.5 to 0.5
            const normX = (x / rect.width) - 0.5;
            const normY = (y / rect.height) - 0.5;
            
            // Define max rotation degrees (skew angle)
            const maxRotX = 8;
            const maxRotY = 8;
            
            // Calculate tilt angle (X mouse moves rotate on Y-axis, Y mouse moves rotate on X-axis)
            const tiltX = -normY * maxRotX;
            const tiltY = normX * maxRotY;
            
            // Apply 3D perspective rotation
            card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            // Smooth return to default state
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        });
    });


    // ==========================================
    // 7. INTERACTIVE FAQ ACCORDION
    // ==========================================
    const faqItems = document.querySelectorAll('.faq-accordion-grid .faq-item');

    faqItems.forEach(item => {
        // Toggle when clicking anywhere on the panel header
        const trigger = item.querySelector('.faq-question');
        
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const isActive = item.classList.contains('active');
            
            // Close other FAQ items for exclusive clean grid
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });
            
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });


    // ==========================================
    // 8. INTERACTIVE BOOKING FORM HANDLER
    // ==========================================
    const bookingForm = document.getElementById('bookingForm');
    const formStatus = document.getElementById('formStatus');
    const submitBtn = document.getElementById('submitBtn');

    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Update button state to loading
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending Request...';
            formStatus.className = 'form-status';
            formStatus.textContent = '';

            // Gather inputs
            const formData = new FormData(bookingForm);
            
            try {
                // Submit to form action handler (FormSubmit endpoint)
                const response = await fetch(bookingForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    // Success display
                    formStatus.classList.add('success');
                    formStatus.textContent = '✓ Booking inquiry sent! Jonathan will contact you within 24 hours.';
                    bookingForm.reset();
                } else {
                    formStatus.classList.add('error');
                    formStatus.textContent = `✗ Submission failed. Please try again or email directly at djjondoe@behindtheboothent.com`;
                }
            } catch (error) {
                // Actual network error
                formStatus.classList.add('error');
                formStatus.textContent = '✗ Network error. Please email directly at djjondoe@behindtheboothent.com';
            } finally {
                // Reset submit button state
                submitBtn.disabled = false;
                submitBtn.textContent = 'Check Date & Get Quote';
                
                // Clear success/error status message after 10 seconds
                setTimeout(() => {
                    formStatus.textContent = '';
                }, 10000);
            }
        });
    }

});
