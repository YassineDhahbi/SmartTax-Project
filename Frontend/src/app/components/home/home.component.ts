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
}
