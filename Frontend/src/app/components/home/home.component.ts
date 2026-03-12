import { Component, OnInit, AfterViewInit, HostListener, ElementRef } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit {

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    this.initializeAnimations();
    this.initializeScrollEffects();
    this.initializeInteractiveElements();
    this.initializeFeatureInteractions();
    this.initializeCounterInteractions();
    this.initializeBlogInteractions();
    this.initializeReclamationInteractions();
  }

  ngAfterViewInit(): void {
    this.triggerInitialAnimations();
  }

  // Initialize animations for hero elements
  private initializeAnimations(): void {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    // Observe hero content elements
    const heroElements = this.el.nativeElement.querySelectorAll('.hero-sub-title, .hero-title, .hero-description, .hero-btn');
    heroElements.forEach((el: Element) => observer.observe(el));
  }

  // Initialize scroll-based effects
  private initializeScrollEffects(): void {
    let ticking = false;

    const updateScrollEffects = () => {
      const scrolled = window.pageYOffset;
      const heroSection = this.el.nativeElement.querySelector('.hero-single');
      
      if (heroSection) {
        // Parallax effect for background
        const yPos = -(scrolled * 0.5);
        heroSection.style.transform = `translateY(${yPos}px)`;
        
        // Fade out effect on scroll
        const opacity = Math.max(0, 1 - (scrolled / 600));
        heroSection.style.opacity = opacity;
      }

      // Animate floating cards based on scroll
      const floatingCards = this.el.nativeElement.querySelectorAll('.floating-card');
      floatingCards.forEach((card: HTMLElement, index: number) => {
        const cardSpeed = 0.5 + (index * 0.1);
        const cardYPos = -(scrolled * cardSpeed);
        card.style.transform = `translateY(${cardYPos}px)`;
      });

      ticking = false;
    };

    const requestTick = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollEffects);
        ticking = true;
      }
    };

    window.addEventListener('scroll', requestTick);
  }

  // Initialize interactive elements
  private initializeInteractiveElements(): void {
    // Add hover effects to floating cards
    const floatingCards = this.el.nativeElement.querySelectorAll('.floating-card');
    floatingCards.forEach((card: HTMLElement) => {
      card.addEventListener('mouseenter', () => {
        card.style.animation = 'none';
        card.style.transform = 'translateY(-10px) scale(1.1) rotate(5deg)';
      });

      card.addEventListener('mouseleave', () => {
        card.style.animation = '';
        card.style.transform = '';
      });
    });

    // Add click ripple effect to buttons
    const buttons = this.el.nativeElement.querySelectorAll('.theme-btn, .theme-btn2');
    buttons.forEach((button: HTMLElement) => {
      button.addEventListener('click', (e: MouseEvent) => {
        this.createRippleEffect(e, button);
      });
    });

    // Add smooth scroll for anchor links
    const anchorLinks = this.el.nativeElement.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach((link: HTMLAnchorElement) => {
      link.addEventListener('click', (e: Event) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        if (targetId && targetId !== '#') {
          this.smoothScrollTo(targetId);
        }
      });
    });
  }

  // Create ripple effect on button click
  private createRippleEffect(event: MouseEvent, button: HTMLElement): void {
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');

    button.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  // Smooth scroll to element
  private smoothScrollTo(targetId: string): void {
    const target = document.querySelector(targetId);
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  // Trigger initial animations
  private triggerInitialAnimations(): void {
    // Add staggered animation to hero elements
    const heroElements = this.el.nativeElement.querySelectorAll('.hero-sub-title, .hero-title, .hero-description, .hero-btn');
    heroElements.forEach((el: HTMLElement, index: number) => {
      setTimeout(() => {
        el.classList.add('animate-in');
      }, index * 200);
    });

    // Animate floating cards with delay
    const floatingCards = this.el.nativeElement.querySelectorAll('.floating-card');
    floatingCards.forEach((card: HTMLElement, index: number) => {
      setTimeout(() => {
        card.classList.add('animate-in');
      }, 1000 + (index * 300));
    });
  }

  // Handle window resize
  @HostListener('window:resize')
  onResize(): void {
    // Adjust animations for mobile
    if (window.innerWidth <= 768) {
      this.adjustForMobile();
    } else {
      this.adjustForDesktop();
    }
  }

  // Adjust for mobile view
  private adjustForMobile(): void {
    const particles = this.el.nativeElement.querySelectorAll('.particle');
    particles.forEach((particle: HTMLElement) => {
      particle.style.display = 'none';
    });
  }

  // Adjust for desktop view
  private adjustForDesktop(): void {
    const particles = this.el.nativeElement.querySelectorAll('.particle');
    particles.forEach((particle: HTMLElement) => {
      particle.style.display = '';
    });
  }

  // Add keyboard navigation
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Press 'Enter' on scroll indicator to scroll down
    if (event.key === 'Enter') {
      const scrollIndicator = this.el.nativeElement.querySelector('.scroll-indicator');
      if (document.activeElement === scrollIndicator) {
        this.smoothScrollTo('#feature-area');
      }
    }

    // Press 'Escape' to reset animations
    if (event.key === 'Escape') {
      this.resetAnimations();
    }
  }

  // Reset all animations
  private resetAnimations(): void {
    const animatedElements = this.el.nativeElement.querySelectorAll('.animate-in');
    animatedElements.forEach((el: HTMLElement) => {
      el.classList.remove('animate-in');
    });

    setTimeout(() => {
      this.triggerInitialAnimations();
    }, 100);
  }

  // Add mouse move parallax effect
  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    const heroSection = this.el.nativeElement.querySelector('.hero-section');
    if (!heroSection) return;

    const { clientX, clientY } = event;
    const { innerWidth, innerHeight } = window;
    
    // Calculate mouse position relative to center
    const mouseX = (clientX - innerWidth / 2) / innerWidth;
    const mouseY = (clientY - innerHeight / 2) / innerHeight;

    // Apply subtle parallax to shapes
    const shapes = this.el.nativeElement.querySelectorAll('.shape');
    shapes.forEach((shape: HTMLElement, index: number) => {
      const speed = 1 + (index * 0.5);
      const x = mouseX * speed * 20;
      const y = mouseY * speed * 20;
      shape.style.transform = `translate(${x}px, ${y}px)`;
    });

    // Apply parallax to particles
    const particles = this.el.nativeElement.querySelectorAll('.particle');
    particles.forEach((particle: HTMLElement, index: number) => {
      const speed = 0.5 + (index * 0.1);
      const x = mouseX * speed * 30;
      const y = mouseY * speed * 30;
      particle.style.transform = `translate(${x}px, ${y}px)`;
    });
  }

  // Initialize feature section interactions
  private initializeFeatureInteractions(): void {
    const featureItems = this.el.nativeElement.querySelectorAll('.feature-item');
    
    // Add hover effects and click tracking
    featureItems.forEach((item: HTMLElement) => {
      const featureType = item.getAttribute('data-feature');
      
      // Enhanced hover effect
      item.addEventListener('mouseenter', () => {
        this.onFeatureHover(item, featureType, true);
      });
      
      item.addEventListener('mouseleave', () => {
        this.onFeatureHover(item, featureType, false);
      });
      
      // Click interaction
      item.addEventListener('click', () => {
        this.onFeatureClick(item, featureType);
      });
      
      // Feature link interactions
      const featureLink = item.querySelector('.feature-link');
      if (featureLink) {
        featureLink.addEventListener('click', (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          this.onFeatureLinkClick(featureLink as HTMLElement, featureType);
        });
      }
    });

    // Initialize scroll animations for features
    this.initializeFeatureScrollAnimations();
  }

  // Handle feature hover effects
  private onFeatureHover(item: HTMLElement, featureType: string | null, isEntering: boolean): void {
    const icon = item.querySelector('.icon-wrapper i') as HTMLElement;
    const numberBg = item.querySelector('.number-bg') as HTMLElement;
    const iconBg = item.querySelector('.icon-bg') as HTMLElement;
    
    if (isEntering) {
      // Add entrance effects
      item.style.transform = 'translateY(-10px) scale(1.02)';
      
      if (icon) {
        icon.classList.add('fa-bounce');
      }
      
      if (numberBg) {
        numberBg.style.transform = 'scale(1.2)';
        numberBg.style.opacity = '0.3';
      }
      
      if (iconBg) {
        iconBg.style.transform = 'scale(1.1) rotate(5deg)';
      }
      
      // Add particle effect around the feature
      this.createFeatureParticles(item);
    } else {
      // Reset effects
      item.style.transform = '';
      
      if (icon) {
        icon.classList.remove('fa-bounce');
      }
      
      if (numberBg) {
        numberBg.style.transform = '';
        numberBg.style.opacity = '';
      }
      
      if (iconBg) {
        iconBg.style.transform = '';
      }
    }
  }

  // Handle feature click
  private onFeatureClick(item: HTMLElement, featureType: string | null): void {
    // Add ripple effect
    this.createFeatureRipple(item);
    
    // Track analytics (if needed)
    console.log(`Feature clicked: ${featureType}`);
    
    // Add visual feedback
    item.style.transform = 'translateY(-5px) scale(0.98)';
    setTimeout(() => {
      item.style.transform = '';
    }, 150);
  }

  // Handle feature link click
  private onFeatureLinkClick(link: HTMLElement, featureType: string | null): void {
    // Add loading state to link
    const originalContent = link.innerHTML;
    link.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Chargement...';
    link.style.pointerEvents = 'none';
    
    // Simulate loading (replace with actual navigation)
    setTimeout(() => {
      link.innerHTML = originalContent;
      link.style.pointerEvents = '';
      
      // Navigate or show modal (implement as needed)
      console.log(`Navigating to feature: ${featureType}`);
    }, 1000);
  }

  // Create particle effects around feature
  private createFeatureParticles(item: HTMLElement): void {
    const rect = item.getBoundingClientRect();
    const particleCount = 5;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'feature-particle';
      particle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: linear-gradient(135deg, var(--accent-color), var(--accent-cyan));
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
        left: ${rect.left + rect.width / 2}px;
        top: ${rect.top + rect.height / 2}px;
        transform: translate(-50%, -50%);
        animation: featureParticleFloat 1s ease-out forwards;
      `;
      
      document.body.appendChild(particle);
      
      // Animate particle outward
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 50 + Math.random() * 50;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      
      setTimeout(() => {
        particle.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(0)`;
        particle.style.opacity = '0';
      }, 10);
      
      // Remove particle after animation
      setTimeout(() => {
        particle.remove();
      }, 1000);
    }
  }

  // Create ripple effect on feature click
  private createFeatureRipple(item: HTMLElement): void {
    const ripple = document.createElement('div');
    ripple.className = 'feature-ripple';
    
    const rect = item.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: radial-gradient(circle, rgba(126, 217, 87, 0.3), transparent);
      border-radius: 50%;
      transform: translate(-50%, -50%) scale(0);
      left: 50%;
      top: 50%;
      pointer-events: none;
      animation: featureRipple 0.6s ease-out forwards;
    `;
    
    item.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  // Initialize scroll animations for features
  private initializeFeatureScrollAnimations(): void {
    const observerOptions = {
      threshold: 0.2,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const item = entry.target as HTMLElement;
          const featureType = item.getAttribute('data-feature');
          
          // Add staggered animation
          setTimeout(() => {
            item.classList.add('feature-animate-in');
          }, this.getFeatureAnimationDelay(featureType));
          
          // Stop observing once animated
          observer.unobserve(item);
        }
      });
    }, observerOptions);

    // Observe all feature items
    const featureItems = this.el.nativeElement.querySelectorAll('.feature-item');
    featureItems.forEach((item: Element) => observer.observe(item));
  }

  // Get animation delay based on feature type
  private getFeatureAnimationDelay(featureType: string | null): number {
    const delays: { [key: string]: number } = {
      'immatriculation': 0,
      'reclamations': 100,
      'consultation': 200,
      'telechargement': 300
    };
    
    return delays[featureType || ''] || 0;
  }

  // Initialize counter section interactions
  private initializeCounterInteractions(): void {
    const counterBoxes = this.el.nativeElement.querySelectorAll('.counter-box');
    
    // Add hover effects and click tracking
    counterBoxes.forEach((box: HTMLElement) => {
      const counterType = box.getAttribute('data-counter');
      
      // Enhanced hover effect
      box.addEventListener('mouseenter', () => {
        this.onCounterHover(box, counterType, true);
      });
      
      box.addEventListener('mouseleave', () => {
        this.onCounterHover(box, counterType, false);
      });
      
      // Click interaction
      box.addEventListener('click', () => {
        this.onCounterClick(box, counterType);
      });
    });

    // Initialize scroll animations for counters
    this.initializeCounterScrollAnimations();
  }

  // Handle counter hover effects
  private onCounterHover(box: HTMLElement, counterType: string | null, isEntering: boolean): void {
    const icon = box.querySelector('.icon-wrapper i') as HTMLElement;
    const iconBg = box.querySelector('.icon-bg') as HTMLElement;
    const counter = box.querySelector('.counter') as HTMLElement;
    
    if (isEntering) {
      // Add entrance effects
      if (icon) {
        icon.style.transform = 'scale(1.1) rotate(5deg)';
      }
      
      if (iconBg) {
        iconBg.style.transform = 'scale(1.05)';
      }
      
      if (counter) {
        counter.style.transform = 'scale(1.05)';
      }
      
      // Add particle effect around the counter
      this.createCounterParticles(box);
    } else {
      // Reset effects
      if (icon) {
        icon.style.transform = '';
      }
      
      if (iconBg) {
        iconBg.style.transform = '';
      }
      
      if (counter) {
        counter.style.transform = '';
      }
    }
  }

  // Handle counter click
  private onCounterClick(box: HTMLElement, counterType: string | null): void {
    // Add ripple effect
    this.createCounterRipple(box);
    
    // Track analytics (if needed)
    console.log(`Counter clicked: ${counterType}`);
    
    // Add visual feedback
    box.style.transform = 'translateY(-5px) scale(0.98)';
    setTimeout(() => {
      box.style.transform = '';
    }, 150);
  }

  // Create particle effects around counter
  private createCounterParticles(box: HTMLElement): void {
    const rect = box.getBoundingClientRect();
    const particleCount = 3;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'counter-particle';
      particle.style.cssText = `
        position: absolute;
        width: 3px;
        height: 3px;
        background: linear-gradient(135deg, #7ED957, #00D4C9);
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
        left: ${rect.left + rect.width / 2}px;
        top: ${rect.top + rect.height / 2}px;
        transform: translate(-50%, -50%);
        animation: counterParticleFloat 1s ease-out forwards;
      `;
      
      document.body.appendChild(particle);
      
      // Animate particle outward
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 30 + Math.random() * 30;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      
      setTimeout(() => {
        particle.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(0)`;
        particle.style.opacity = '0';
      }, 10);
      
      // Remove particle after animation
      setTimeout(() => {
        particle.remove();
      }, 1000);
    }
  }

  // Create ripple effect on counter click
  private createCounterRipple(box: HTMLElement): void {
    const ripple = document.createElement('div');
    ripple.className = 'counter-ripple';
    
    const rect = box.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: radial-gradient(circle, rgba(126, 217, 87, 0.3), transparent);
      border-radius: 50%;
      transform: translate(-50%, -50%) scale(0);
      left: 50%;
      top: 50%;
      pointer-events: none;
      animation: counterRipple 0.6s ease-out forwards;
    `;
    
    box.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  // Initialize scroll animations for counters
  private initializeCounterScrollAnimations(): void {
    const observerOptions = {
      threshold: 0.5,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const box = entry.target as HTMLElement;
          const counterType = box.getAttribute('data-counter');
          
          // Start counter animation
          this.animateCounter(box);
          
          // Add staggered animation
          setTimeout(() => {
            box.classList.add('counter-animate-in');
          }, this.getCounterAnimationDelay(counterType));
          
          // Stop observing once animated
          observer.unobserve(box);
        }
      });
    }, observerOptions);

    // Observe all counter boxes
    const counterBoxes = this.el.nativeElement.querySelectorAll('.counter-box');
    counterBoxes.forEach((item: Element) => observer.observe(item));
  }

  // Animate counter number
  private animateCounter(box: HTMLElement): void {
    const counterElement = box.querySelector('.counter') as HTMLElement;
    if (!counterElement) return;

    const target = parseInt(counterElement.getAttribute('data-to') || '0');
    const duration = parseInt(counterElement.getAttribute('data-speed') || '3000');
    const prefix = counterElement.getAttribute('data-count') || '';
    
    let start = 0;
    const increment = target / (duration / 16); // 60fps
    
    const updateCounter = () => {
      start += increment;
      if (start < target) {
        counterElement.textContent = prefix + Math.floor(start).toLocaleString();
        requestAnimationFrame(updateCounter);
      } else {
        counterElement.textContent = prefix + target.toLocaleString();
      }
    };
    
    updateCounter();
  }

  // Get animation delay based on counter type
  private getCounterAnimationDelay(counterType: string | null): number {
    const delays: { [key: string]: number } = {
      'projects': 0,
      'clients': 100,
      'experts': 200,
      'awards': 300
    };
    
    return delays[counterType || ''] || 0;
  }

  // Initialize blog section interactions
  private initializeBlogInteractions(): void {
    const blogItems = this.el.nativeElement.querySelectorAll('.blog-item');
    
    // Add hover effects and click tracking
    blogItems.forEach((item: HTMLElement) => {
      const blogType = item.getAttribute('data-blog');
      
      // Enhanced hover effect
      item.addEventListener('mouseenter', () => {
        this.onBlogHover(item, blogType, true);
      });
      
      item.addEventListener('mouseleave', () => {
        this.onBlogHover(item, blogType, false);
      });
      
      // Click interaction
      item.addEventListener('click', () => {
        this.onBlogClick(item, blogType);
      });
    });

    // Initialize scroll animations for blog items
    this.initializeBlogScrollAnimations();
  }

  // Handle blog hover effects
  private onBlogHover(item: HTMLElement, blogType: string | null, isEntering: boolean): void {
    const image = item.querySelector('.blog-image img') as HTMLElement;
    const overlay = item.querySelector('.blog-overlay') as HTMLElement;
    const link = item.querySelector('.blog-link') as HTMLElement;
    
    if (isEntering) {
      // Add entrance effects
      if (image) {
        image.style.transform = 'scale(1.1)';
      }
      
      if (overlay) {
        overlay.style.opacity = '1';
      }
      
      if (link) {
        link.style.gap = '12px';
        const icon = link.querySelector('i') as HTMLElement;
        if (icon) {
          icon.style.transform = 'translateX(3px)';
        }
      }
      
      // Add particle effect around the blog item
      this.createBlogParticles(item);
    } else {
      // Reset effects
      if (image) {
        image.style.transform = '';
      }
      
      if (overlay) {
        overlay.style.opacity = '';
      }
      
      if (link) {
        link.style.gap = '';
        const icon = link.querySelector('i') as HTMLElement;
        if (icon) {
          icon.style.transform = '';
        }
      }
    }
  }

  // Handle blog click
  private onBlogClick(item: HTMLElement, blogType: string | null): void {
    // Add ripple effect
    this.createBlogRipple(item);
    
    // Track analytics (if needed)
    console.log(`Blog clicked: ${blogType}`);
    
    // Add visual feedback
    item.style.transform = 'translateY(-15px) scale(0.98)';
    setTimeout(() => {
      item.style.transform = '';
    }, 150);
  }

  // Create particle effects around blog item
  private createBlogParticles(item: HTMLElement): void {
    const rect = item.getBoundingClientRect();
    const particleCount = 4;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'blog-particle';
      particle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: linear-gradient(135deg, #7ED957, #00D4C9);
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
        left: ${rect.left + rect.width / 2}px;
        top: ${rect.top + rect.height / 2}px;
        transform: translate(-50%, -50%);
        animation: blogParticleFloat 1.2s ease-out forwards;
      `;
      
      document.body.appendChild(particle);
      
      // Animate particle outward
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 40 + Math.random() * 40;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      
      setTimeout(() => {
        particle.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(0)`;
        particle.style.opacity = '0';
      }, 10);
      
      // Remove particle after animation
      setTimeout(() => {
        particle.remove();
      }, 1200);
    }
  }

  // Create ripple effect on blog click
  private createBlogRipple(item: HTMLElement): void {
    const ripple = document.createElement('div');
    ripple.className = 'blog-ripple';
    
    const rect = item.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: radial-gradient(circle, rgba(126, 217, 87, 0.2), transparent);
      border-radius: 50%;
      transform: translate(-50%, -50%) scale(0);
      left: 50%;
      top: 50%;
      pointer-events: none;
      animation: blogRipple 0.8s ease-out forwards;
    `;
    
    item.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 800);
  }

  // Initialize scroll animations for blog items
  private initializeBlogScrollAnimations(): void {
    const observerOptions = {
      threshold: 0.3,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const item = entry.target as HTMLElement;
          const blogType = item.getAttribute('data-blog');
          
          // Add staggered animation
          setTimeout(() => {
            item.classList.add('blog-animate-in');
          }, this.getBlogAnimationDelay(blogType));
          
          // Stop observing once animated
          observer.unobserve(item);
        }
      });
    }, observerOptions);

    // Observe all blog items
    const blogItems = this.el.nativeElement.querySelectorAll('.blog-item');
    blogItems.forEach((item: Element) => observer.observe(item));
  }

  // Get animation delay based on blog type
  private getBlogAnimationDelay(blogType: string | null): number {
    const delays: { [key: string]: number } = {
      'fiscal': 0,
      'conseils': 100,
      'actualites': 200
    };
    
    return delays[blogType || ''] || 0;
  }

  // Initialize reclamation form interactions
  private initializeReclamationInteractions(): void {
    const form = this.el.nativeElement.querySelector('.reclamation-form');
    const inputs = this.el.nativeElement.querySelectorAll('.reclamation-form .form-control, .reclamation-form .form-select');
    const submitBtn = this.el.nativeElement.querySelector('.reclamation-btn') as HTMLButtonElement;
    
    // Initialize map
    this.initializeDGIMap();
    
    // Add focus effects to form inputs
    inputs.forEach((input: Element) => {
      const htmlInput = input as HTMLElement;
      htmlInput.addEventListener('focus', () => {
        this.onReclamationInputFocus(htmlInput, true);
      });
      
      htmlInput.addEventListener('blur', () => {
        this.onReclamationInputFocus(htmlInput, false);
      });
      
      htmlInput.addEventListener('input', () => {
        this.onReclamationInputChange(htmlInput);
      });
    });

    // Handle form submission
    if (form) {
      form.addEventListener('submit', (event: Event) => {
        this.onReclamationSubmit(event);
      });
    }

    // Add hover effect to submit button
    if (submitBtn) {
      submitBtn.addEventListener('mouseenter', () => {
        this.onReclamationBtnHover(submitBtn, true);
      });
      
      submitBtn.addEventListener('mouseleave', () => {
        this.onReclamationBtnHover(submitBtn, false);
      });
    }

    // Initialize scroll animations for reclamation elements
    this.initializeReclamationScrollAnimations();
  }

  // Initialize DGI Map
  private initializeDGIMap(): void {
    // Make functions globally available
    (window as any).openGoogleMaps = this.openGoogleMaps.bind(this);
    (window as any).getDirections = this.getDirections.bind(this);
    
    // Initialize map after a short delay
    setTimeout(() => {
      this.loadDGIMap();
    }, 1000);
  }

  // Load DGI Map
  private loadDGIMap(): void {
    const mapContainer = this.el.nativeElement.querySelector('#dgi-map');
    if (!mapContainer) return;

    // Coordinates for Direction Générale des Impôts, Tunis
    const dgiCoordinates = {
      lat: 36.8065,
      lng: 10.1815
    };

    // Create map placeholder with actual map
    mapContainer.innerHTML = `
      <iframe 
        width="100%" 
        height="100%" 
        frameborder="0" 
        style="border:0" 
        src="https://maps.google.com/maps?q=${dgiCoordinates.lat},${dgiCoordinates.lng}&z=17&output=embed"
        allowfullscreen>
      </iframe>
      <div class="map-marker-overlay">
        <div class="custom-marker">
          <i class="fas fa-building"></i>
        </div>
      </div>
    `;
  }

  // Open Google Maps
  private openGoogleMaps(): void {
    const address = 'Direction Générale des Impôts, 16 Av. Kheireddine Pacha, Tunis';
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  }

  // Get Directions
  private getDirections(): void {
    const address = 'Direction Générale des Impôts, 16 Av. Kheireddine Pacha, Tunis';
    const encodedAddress = encodeURIComponent(address);
    
    // Try to get user's location for directions
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          window.open(`https://www.google.com/maps/dir/${latitude},${longitude}/${encodedAddress}`, '_blank');
        },
        () => {
          // Fallback if location is denied
          window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
        }
      );
    } else {
      // Fallback if geolocation is not supported
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
    }
  }

  // Handle input focus effects
  private onReclamationInputFocus(input: HTMLElement, isFocused: boolean): void {
    const icon = input.parentElement?.querySelector('i') as HTMLElement;
    
    if (isFocused) {
      if (icon) {
        icon.style.color = '#7ED957';
        icon.style.transform = 'translateY(-50%) scale(1.1)';
      }
      input.style.transform = 'translateY(-2px)';
    } else {
      if (icon) {
        icon.style.color = '';
        icon.style.transform = '';
      }
      input.style.transform = '';
    }
  }

  // Handle input changes with validation feedback
  private onReclamationInputChange(input: HTMLElement): void {
    const value = (input as HTMLInputElement | HTMLTextAreaElement).value;
    const isEmpty = value.trim() === '';
    
    if (!isEmpty) {
      input.style.borderColor = '#7ED957';
      input.style.boxShadow = '0 0 0 3px rgba(126, 217, 87, 0.1)';
    } else {
      input.style.borderColor = '';
      input.style.boxShadow = '';
    }
  }

  // Handle button hover effects
  private onReclamationBtnHover(button: HTMLElement, isHovering: boolean): void {
    const icon = button.querySelector('i') as HTMLElement;
    
    if (isHovering) {
      if (icon) {
        icon.style.transform = 'translateX(3px) rotate(5deg)';
      }
      // Add particle effect
      this.createReclamationParticles(button);
    } else {
      if (icon) {
        icon.style.transform = '';
      }
    }
  }

  // Handle form submission
  private onReclamationSubmit(event: Event): void {
    event.preventDefault();
    
    const form = event.target as HTMLFormElement;
    const submitBtn = form.querySelector('.reclamation-btn') as HTMLButtonElement;
    const formData = new FormData(form);
    
    // Add loading state
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';
      submitBtn.disabled = true;
    }
    
    // Simulate API call
    setTimeout(() => {
      this.showReclamationSuccess(form, submitBtn);
    }, 2000);
  }

  // Show success message
  private showReclamationSuccess(form: HTMLFormElement, submitBtn: HTMLButtonElement): void {
    // Reset button
    submitBtn.innerHTML = '<i class="fas fa-check"></i> Réclamation envoyée!';
    submitBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    
    // Create success animation
    this.createReclamationSuccessAnimation(form);
    
    // Reset form after delay
    setTimeout(() => {
      form.reset();
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Envoyer la réclamation';
      submitBtn.style.background = '';
      submitBtn.disabled = false;
      
      // Reset input styles
      const inputs = form.querySelectorAll('.form-control, .form-select');
      inputs.forEach((input: Element) => {
        const htmlInput = input as HTMLElement;
        htmlInput.style.borderColor = '';
        htmlInput.style.boxShadow = '';
      });
    }, 3000);
  }

  // Create particle effects for reclamation button
  private createReclamationParticles(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const particleCount = 3;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'reclamation-particle';
      particle.style.cssText = `
        position: absolute;
        width: 3px;
        height: 3px;
        background: linear-gradient(135deg, #7ED957, #00D4C9);
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
        left: ${rect.left + rect.width / 2}px;
        top: ${rect.top + rect.height / 2}px;
        transform: translate(-50%, -50%);
        animation: reclamationParticleFloat 1s ease-out forwards;
      `;
      
      document.body.appendChild(particle);
      
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 30 + Math.random() * 30;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      
      setTimeout(() => {
        particle.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(0)`;
        particle.style.opacity = '0';
      }, 10);
      
      setTimeout(() => {
        particle.remove();
      }, 1000);
    }
  }

  // Create success animation
  private createReclamationSuccessAnimation(form: HTMLElement): void {
    const successMessage = document.createElement('div');
    successMessage.className = 'reclamation-success';
    successMessage.innerHTML = `
      <div class="success-icon">✓</div>
      <div class="success-text">Votre réclamation a été envoyée avec succès!</div>
    `;
    successMessage.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 15px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 10000;
      animation: reclamationSuccessSlide 0.5s ease-out;
    `;
    
    document.body.appendChild(successMessage);
    
    setTimeout(() => {
      successMessage.style.animation = 'reclamationSuccessSlideOut 0.5s ease-out forwards';
      setTimeout(() => {
        successMessage.remove();
      }, 500);
    }, 2500);
  }

  // Initialize scroll animations for reclamation elements
  private initializeReclamationScrollAnimations(): void {
    const observerOptions = {
      threshold: 0.3,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          
          if (element.classList.contains('reclamation-image')) {
            element.style.animation = 'reclamationSlideInLeft 0.8s ease-out forwards';
          } else if (element.classList.contains('reclamation-form-wrapper')) {
            element.style.animation = 'reclamationSlideInRight 0.8s ease-out 0.2s forwards';
          }
          
          observer.unobserve(element);
        }
      });
    }, observerOptions);

    // Observe reclamation elements
    const reclamationImage = this.el.nativeElement.querySelector('.reclamation-image');
    const reclamationForm = this.el.nativeElement.querySelector('.reclamation-form-wrapper');
    
    if (reclamationImage) observer.observe(reclamationImage);
    if (reclamationForm) observer.observe(reclamationForm);
  }
}
