import { Component, OnInit, ElementRef } from '@angular/core';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent implements OnInit {

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    this.initializeAboutAnimations();
    this.initializeScrollAnimations();
    this.initializeCounterAnimations();
    this.initializeImageHoverEffects();
  }

  // Initialize about page animations
  private initializeAboutAnimations(): void {
    // Add entrance animations to hero content
    const heroContent = this.el.nativeElement.querySelector('.about-hero-content');
    const heroImage = this.el.nativeElement.querySelector('.about-hero-image');
    
    if (heroContent) {
      heroContent.classList.add('animate-fade-in-left');
    }
    
    if (heroImage) {
      heroImage.classList.add('animate-fade-in-right');
    }

    // Add staggered animations to stats
    const stats = this.el.nativeElement.querySelectorAll('.about-hero-stats .stat-item');
    stats.forEach((stat: Element, index: number) => {
      const htmlStat = stat as HTMLElement;
      setTimeout(() => {
        htmlStat.classList.add('animate-slide-in-up');
      }, 200 * (index + 1));
    });

    // Add hover effects to action buttons
    const actionButtons = this.el.nativeElement.querySelectorAll('.about-hero-actions .theme-btn, .about-hero-actions .theme-btn2');
    actionButtons.forEach((button: Element) => {
      const htmlButton = button as HTMLElement;
      htmlButton.addEventListener('mouseenter', () => {
        this.onButtonHover(htmlButton, true);
      });
      
      htmlButton.addEventListener('mouseleave', () => {
        this.onButtonHover(htmlButton, false);
      });
    });
  }

  // Initialize scroll animations
  private initializeScrollAnimations(): void {
    const observerOptions = {
      threshold: 0.2,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          element.classList.add('animate-in');
          observer.unobserve(element);
        }
      });
    }, observerOptions);

    // Observe different sections
    const sections = [
      '.mission-card',
      '.vision-card', 
      '.value-item',
      '.team-member',
      '.achievement-item'
    ];

    sections.forEach(selector => {
      const elements = this.el.nativeElement.querySelectorAll(selector);
      elements.forEach((element: Element) => {
        observer.observe(element);
      });
    });
  }

  // Initialize counter animations for statistics
  private initializeCounterAnimations(): void {
    const observerOptions = {
      threshold: 0.5,
      rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          this.animateCounter(element);
          observer.unobserve(element);
        }
      });
    }, observerOptions);

    // Observe all counter elements
    const counters = this.el.nativeElement.querySelectorAll('.about-hero-stats strong, .achievement-content h3');
    counters.forEach((counter: Element) => {
      observer.observe(counter);
    });
  }

  // Animate counter from 0 to target value
  private animateCounter(element: HTMLElement): void {
    const target = element.textContent || '0';
    const numericValue = this.extractNumericValue(target);
    const suffix = this.extractSuffix(target);
    
    if (numericValue === 0) return;

    let current = 0;
    const increment = numericValue / 50;
    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        current = numericValue;
        clearInterval(timer);
      }
      element.textContent = this.formatNumber(Math.floor(current)) + suffix;
    }, 30);
  }

  // Extract numeric value from text
  private extractNumericValue(text: string): number {
    const match = text.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }

  // Extract suffix from text (like +, M, etc.)
  private extractSuffix(text: string): string {
    const match = text.match(/[^\d.]+$/);
    return match ? match[0] : '';
  }

  // Format number with commas
  private formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // Initialize image hover effects
  private initializeImageHoverEffects(): void {
    const gridItems = this.el.nativeElement.querySelectorAll('.grid-item');
    
    gridItems.forEach((item: Element) => {
      const htmlItem = item as HTMLElement;
      htmlItem.addEventListener('mouseenter', () => {
        this.onImageHover(htmlItem, true);
      });
      
      htmlItem.addEventListener('mouseleave', () => {
        this.onImageHover(htmlItem, false);
      });
    });

    // Team member hover effects
    const teamMembers = this.el.nativeElement.querySelectorAll('.team-member');
    teamMembers.forEach((member: Element) => {
      const htmlMember = member as HTMLElement;
      htmlMember.addEventListener('mouseenter', () => {
        this.onTeamMemberHover(htmlMember, true);
      });
      
      htmlMember.addEventListener('mouseleave', () => {
        this.onTeamMemberHover(htmlMember, false);
      });
    });
  }

  // Handle image hover effects
  private onImageHover(item: HTMLElement, isHovered: boolean): void {
    const overlay = item.querySelector('.image-overlay') as HTMLElement;
    
    if (isHovered) {
      item.style.transform = 'translateY(-10px) scale(1.02)';
      if (overlay) {
        overlay.style.transform = 'translateY(0)';
      }
    } else {
      item.style.transform = 'translateY(0) scale(1)';
      if (overlay) {
        overlay.style.transform = 'translateY(100%)';
      }
    }
  }

  // Handle team member hover effects
  private onTeamMemberHover(member: HTMLElement, isHovered: boolean): void {
    const overlay = member.querySelector('.member-overlay') as HTMLElement;
    const socialLinks = member.querySelectorAll('.social-links a');
    
    if (isHovered) {
      member.style.transform = 'translateY(-10px)';
      if (overlay) {
        overlay.style.opacity = '1';
      }
      
      // Animate social links
      socialLinks.forEach((link: Element, index: number) => {
        const htmlLink = link as HTMLElement;
        setTimeout(() => {
          htmlLink.style.transform = 'scale(1.1)';
        }, 100 * index);
      });
    } else {
      member.style.transform = 'translateY(0)';
      if (overlay) {
        overlay.style.opacity = '0';
      }
      
      socialLinks.forEach((link: Element) => {
        const htmlLink = link as HTMLElement;
        htmlLink.style.transform = 'scale(1)';
      });
    }
  }

  // Handle button hover effects
  private onButtonHover(button: HTMLElement, isHovered: boolean): void {
    const icon = button.querySelector('i') as HTMLElement;
    
    if (isHovered) {
      button.style.transform = 'translateY(-3px)';
      button.style.boxShadow = '0 10px 30px rgba(11, 94, 168, 0.3)';
      if (icon) {
        icon.style.transform = 'translateX(5px)';
      }
    } else {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '';
      if (icon) {
        icon.style.transform = 'translateX(0)';
      }
    }
  }
}
