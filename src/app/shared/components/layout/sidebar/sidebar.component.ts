import { Component, OnInit, Input, Output, EventEmitter, HostListener, ChangeDetectorRef } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AnimationService } from '../../../../core/services/animation.service';
import { RolesUsers } from '../../../../core/models/user.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  @Input() isSidebarOpen: boolean = true;
  @Input() windowWidth: number = 0;
  @Output() toggleSidebarEvent = new EventEmitter<void>();
  @Output() optionSelected = new EventEmitter<void>();
  userRole: RolesUsers[] = [];
  RolesUsers = RolesUsers;
  isWaterQualityDropdownOpen: boolean = false;
  isOrganizationsDropdownOpen: boolean = false;
  isDistributionMenuOpen: boolean = false;
  isComplaintsIncidentsDropdownOpen: boolean = false;
  isInfrastructureDropdownOpen: boolean = false;
  isInventoryDropdownOpen: boolean = false;

  constructor(
    public authService: AuthService,
    private animationService: AnimationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }
  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.windowWidth = window.innerWidth;
    this.cdr.detectChanges();
  }
  ngOnInit() {
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 100); const currentUser = this.authService.getCurrentUser();
    this.userRole = currentUser?.roles || [];

    const savedState = localStorage.getItem('sidebarState');
    if (savedState !== null) {
      this.isSidebarOpen = JSON.parse(savedState);
    }
  }

  // Función helper para cerrar todos los dropdowns
  private closeAllDropdowns(): void {
    this.isWaterQualityDropdownOpen = false;
    this.isOrganizationsDropdownOpen = false;
    this.isDistributionMenuOpen = false;
    this.isComplaintsIncidentsDropdownOpen = false;
    this.isInfrastructureDropdownOpen = false;
    this.isInventoryDropdownOpen = false;
  }

  toggleDistributionMenu(): void {
    const wasOpen = this.isDistributionMenuOpen;
    this.closeAllDropdowns();
    this.isDistributionMenuOpen = !wasOpen;
  }

  toggleInfrastructureDropdown(): void {
    const wasOpen = this.isInfrastructureDropdownOpen;
    this.closeAllDropdowns();
    this.isInfrastructureDropdownOpen = !wasOpen;
  }

  toggleWaterQualityDropdown() {
    const wasOpen = this.isWaterQualityDropdownOpen;
    this.closeAllDropdowns();
    this.isWaterQualityDropdownOpen = !wasOpen;
  }

  toggleOrganizationsDropdown() {
    const wasOpen = this.isOrganizationsDropdownOpen;
    this.closeAllDropdowns();
    this.isOrganizationsDropdownOpen = !wasOpen;
  }

  toggleComplaintsIncidentsDropdown(): void {
    const wasOpen = this.isComplaintsIncidentsDropdownOpen;
    this.closeAllDropdowns();
    this.isComplaintsIncidentsDropdownOpen = !wasOpen;
  }

  toggleInventoryDropdown(): void {
    const wasOpen = this.isInventoryDropdownOpen;
    this.closeAllDropdowns();
    this.isInventoryDropdownOpen = !wasOpen;
  }
  closeSidebar() {
    this.isSidebarOpen = false;
    this.toggleSidebarEvent.emit();
  }
  onOptionSelected() {
    this.closeAllDropdowns();
    this.optionSelected.emit();
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    localStorage.setItem('sidebarState', JSON.stringify(this.isSidebarOpen));
    this.toggleSidebarEvent.emit();
  }

  logout() {
    this.animationService.showGoodbyeAnimation();

    setTimeout(() => {
      localStorage.clear();
      this.authService.logout();
      this.router.navigate(['/auth/login']);
    }, 3000);
  }

  hasRole(role: RolesUsers): boolean {
    const activeRole = this.authService.getActiveRole();
    if (activeRole) {
      return activeRole === role;
    }
    return this.authService.hasRole(role);
  }

  hasAnyRole(roles: RolesUsers[]): boolean {
    const activeRole = this.authService.getActiveRole();
    if (activeRole) {
      return roles.includes(activeRole);
    }
    return this.authService.hasAnyRole(roles);
  }

  hasActiveRole(role: RolesUsers): boolean {
    const activeRole = this.authService.getActiveRole();
    return activeRole === role;
  }

  hasAnyActiveRole(roles: RolesUsers[]): boolean {
    const activeRole = this.authService.getActiveRole();
    return activeRole ? roles.includes(activeRole) : false;
  }

  getCurrentUserName(): string {
    const user = this.authService.getCurrentUser();
    return user?.fullName || 'Usuario';
  }

  getUserInitials(): string {
    const user = this.authService.getCurrentUser();
    if (user?.fullName) {
      return user.fullName.split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return 'U';
  }

  getUserRoleDisplay(): string {
    const user = this.authService.getCurrentUser();
    if (!user?.roles || user.roles.length === 0) return 'Usuario';

    const roleDisplayMap = {
      [RolesUsers.SUPER_ADMIN]: 'Super Admin',
      [RolesUsers.ADMIN]: 'Administrador',
      [RolesUsers.CLIENT]: 'Cliente'
    };


    if (user.roles.includes(RolesUsers.SUPER_ADMIN)) {
      return roleDisplayMap[RolesUsers.SUPER_ADMIN];
    } else if (user.roles.includes(RolesUsers.ADMIN)) {
      return roleDisplayMap[RolesUsers.ADMIN];
    } else if (user.roles.includes(RolesUsers.CLIENT)) {
      return roleDisplayMap[RolesUsers.CLIENT];
    }

    return 'Usuario';
  }

  getDashboardRoute(): string {
    const activeRole = this.authService.getActiveRole();
    if (activeRole) {
      switch (activeRole) {
        case RolesUsers.SUPER_ADMIN:
          return '/super-admin/dashboard';
        case RolesUsers.ADMIN:
          return '/admin/dashboard';
        case RolesUsers.CLIENT:
          return '/client/dashboard';
        default:
          break;
      }
    }

    // Fallback a la lógica anterior si no hay rol activo
    const user = this.authService.getCurrentUser();
    if (!user?.roles || user.roles.length === 0) return '/';

    if (user.roles.includes(RolesUsers.SUPER_ADMIN)) {
      return '/super-admin/dashboard';
    } else if (user.roles.includes(RolesUsers.ADMIN)) {
      return '/admin/dashboard';
    } else if (user.roles.includes(RolesUsers.CLIENT)) {
      return '/client/dashboard';
    }

    return '/';
  }
}
