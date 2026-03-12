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
}
