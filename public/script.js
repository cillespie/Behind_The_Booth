/* ==========================================================================
   Behind The Booth Entertainment LLC - Premium JavaScript Controller
   Interactions: Sticky Navbar, Mobile Navigation, Scroll Reveals,
                 Gear Accordion, 3D Card Hover Tilts,
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
        const isOpen = mobileMenu.classList.toggle('open');
        mobileNavToggle.classList.toggle('open', isOpen);
        mobileNavToggle.setAttribute('aria-expanded', String(isOpen));
        // Prevent body scrolling when menu is open
        document.body.style.overflow = isOpen ? 'hidden' : '';
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
            
            // Close all items and reset aria
            accordionItems.forEach(otherItem => {
                otherItem.classList.remove('active');
                const otherTrigger = otherItem.querySelector('.accordion-trigger');
                if (otherTrigger) {
                    otherTrigger.setAttribute('aria-expanded', 'false');
                }
            });
            
            // If the clicked item wasn't active, open it
            if (!isActive) {
                item.classList.add('active');
                trigger.setAttribute('aria-expanded', 'true');
            }
        });
    });


    // ==========================================
    // 5. DYNAMIC 3D CARD HOVER TILT EFFECTS
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
    // 6. INTERACTIVE FAQ ACCORDION
    // ==========================================
    const faqItems = document.querySelectorAll('.faq-accordion-grid .faq-item');

    faqItems.forEach(item => {
        // Toggle when clicking anywhere on the panel header
        const trigger = item.querySelector('.faq-question');
        
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const isActive = item.classList.contains('active');
            
            // Close other FAQ items and reset aria
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
                const otherTrigger = otherItem.querySelector('.faq-question');
                if (otherTrigger) {
                    otherTrigger.setAttribute('aria-expanded', 'false');
                }
            });
            
            if (!isActive) {
                item.classList.add('active');
                trigger.setAttribute('aria-expanded', 'true');
            }
        });
    });


    // ==========================================
    // 7. DATE INPUT MINIMUM (prevent past dates)
    // ==========================================
    const today = new Date().toISOString().split('T')[0];
    const eventDateInput = document.getElementById('eventDate');
    const consultDateInput = document.getElementById('consultationDate');
    if (eventDateInput) eventDateInput.setAttribute('min', today);
    if (consultDateInput) consultDateInput.setAttribute('min', today);


    // ==========================================
    // 8. INTERACTIVE BOOKING FORM HANDLER
    // ==========================================
    const bookingForm = document.getElementById('bookingForm');
    const formStatus = document.getElementById('formStatus');
    const submitBtn = document.getElementById('submitBtn');

    if (bookingForm) {
        // Capture the real button label on load so we can restore it later
        const originalBtnText = submitBtn.textContent;

        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Update button state to loading
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending Request...';
            formStatus.className = 'form-status';
            formStatus.textContent = '';

            // Gather inputs as a plain object for JSON body
            const formData = new FormData(bookingForm);
            const payload = {};
            formData.forEach((value, key) => {
                payload[key] = value;
            });
            
            try {
                const response = await fetch('/api/booking', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const result = await response.json().catch(() => null);

                if (response.ok) {
                    // Success display
                    formStatus.classList.add('success');
                    formStatus.textContent = '✓ Booking inquiry sent! Jonathan will contact you within 24 hours.';
                    bookingForm.reset();
                } else if (response.status === 429) {
                    formStatus.classList.add('error');
                    formStatus.textContent = '✗ Too many submissions. Please try again in an hour.';
                } else {
                    formStatus.classList.add('error');
                    formStatus.textContent = result?.error || '✗ Submission failed. Please try again or email directly at djjondoe@behindtheboothent.com';
                }
            } catch (error) {
                // Actual network error
                formStatus.classList.add('error');
                formStatus.textContent = '✗ Network error. Please email directly at djjondoe@behindtheboothent.com';
            } finally {
                // Reset submit button state using the captured original label
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
                
                // Clear success/error status message after 10 seconds
                setTimeout(() => {
                    formStatus.textContent = '';
                }, 10000);
            }
        });
    }

});
