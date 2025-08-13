import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';
import { adminGuard } from './core/auth/guards/admin.guard';
import { clientGuard } from './core/auth/guards/client.guard';
import { AdminComponent } from './layouts/admin/admin.component';
import { ClientComponent } from './layouts/client/client.component';
import { SuperAdminComponent } from './layouts/super-admin/super-admin.component';

export const APP_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./views/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'role-selector',
    loadComponent: () => import('./views/auth/role-selector/role-selector.component').then(m => m.RoleSelectorComponent)
  },
  {
    path: 'auth',
    loadChildren: () => import('./views/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: 'box-assignment',
        loadComponent: () => import('./modules/infrastructure/components/box-assignment/box-assignment.component').then(c => c.BoxAssignmentComponent),
      },
      {
        path: 'box-transfer',
        loadComponent: () => import('./modules/infrastructure/components/box-transfer/box-transfer.component').then(c => c.BoxTransferComponent),
      },
      {
        path: 'water-box',
        loadComponent: () => import('./modules/infrastructure/components/water-box/water-box.component').then(c => c.WaterBoxComponent),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./views/admin/dashboard/dashboard.component').then(c => c.DashboardComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./views/admin/reports/reports.component').then(c => c.ReportsComponent)
      },
      {
        path: 'users',
        loadChildren: () => import('./modules/clients/clients.routes').then(m => m.CLIENTS_ROUTES)
      },

      {
        path: 'clients',
        redirectTo: 'users',
        pathMatch: 'full'
      },
      {
        path: 'payments',
        children: [
          {
            path: '',
            loadComponent: () => import('./modules/payments/components/payment-list/payment-list.component').then(c => c.PaymentListComponent)
          },
          {
            path: 'new',
            loadComponent: () => import('./modules/payments/components/payment-form/payment-form.component').then(c => c.PaymentFormComponent)
          },
          {
            path: 'edit/:id',
            loadComponent: () => import('./modules/payments/components/payment-form/payment-form.component').then(c => c.PaymentFormComponent)
          },
          {
            path: 'detail/:id',
            loadComponent: () => import('./modules/payments/components/payment-detail/payment-detail.component').then(c => c.PaymentDetailComponent)
          }
        ]
      },
      {
        path: 'water-quality',
        loadChildren: () => import('./modules/water-quality/water-quality-routing.module').then(m => m.WaterQualityRoutingModule)
      },
      {
        path: 'inventory',
        loadChildren: () => import('./modules/inventory/inventory.module').then(m => m.InventoryModule)
      },
      {
        path: 'complaints-incidents',
        loadChildren: () => import('./modules/complaints-incidents/complaints-incidents.module').then(m => m.ComplaintsIncidentsModule)
      },
      {
        path: 'distribution',
        children: [
          {
            path: 'routes',
            loadComponent: () =>
              import('./modules/distribution/components/routes/routes-list/routes-list.component')
                .then(c => c.RoutesListComponent),
          },
          {
            path: 'programs',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./modules/water-distribution/components/program-list/program-list.component')
                    .then(c => c.ProgramListComponent),
              },
              {
                path: 'new',
                loadComponent: () =>
                  import('./modules/water-distribution/components/program-form/program-form.component')
                    .then(c => c.ProgramFormComponent),
              },
              {
                path: 'edit/:id',
                loadComponent: () =>
                  import('./modules/water-distribution/components/program-form/program-form.component')
                    .then(c => c.ProgramFormComponent),
                data: { editMode: true }
              },
              {
                path: 'view/:id',
                loadComponent: () =>
                  import('./modules/water-distribution/components/program-detail/program-detail.component')
                    .then(c => c.ProgramDetailComponent),
              }
            ]
          },
          {
            path: 'fares',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./modules/distribution/components/fares/fares-list/fare-list.component')
                    .then(c => c.FareListComponent),
              },
              {
                path: 'new',
                loadComponent: () =>
                  import('./modules/distribution/components/fares/fares-form/fare-form.component')
                    .then(c => c.FareFormComponent),
              },
              {
                path: 'edit/:id',
                loadComponent: () =>
                  import('./modules/distribution/components/fares/fares-form/fare-form.component')
                    .then(c => c.FareFormComponent),
              }
            ]
          },
          {
            path: 'schedule',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./modules/distribution/components/schedule/schedule-list/schedule-list.component')
                    .then(c => c.ScheduleListComponent),
              },
              {
                path: 'new',
                loadComponent: () =>
                  import('./modules/distribution/components/schedule/schedule-form/schedule-form.component')
                    .then(c => c.ScheduleFormComponent),
              },
              {
                path: 'edit/:id',
                loadComponent: () =>
                  import('./modules/distribution/components/schedule/schedule-form/schedule-form.component')
                    .then(c => c.ScheduleFormComponent),
              }
            ]
          },
        ]
      },
    ]
  },
  {
    path: 'client',
    component: ClientComponent,
    canActivate: [clientGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./views/client/dashboard/dashboard.component').then(c => c.DashboardComponent)
      },
      {
        path: 'my-account',
        loadComponent: () => import('./views/client/my-account/my-account.component').then(c => c.MyAccountComponent)
      },
      {
        path: 'my-payments',
        loadComponent: () => import('./views/client/my-payments/my-payments.component').then(c => c.MyPaymentsComponent)
      }
    ]
  },
  {
    path: 'super-admin',
    component: SuperAdminComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./views/super-admin/dashboard/dashboard.component').then(c => c.DashboardComponent)
      },
      {
        path: 'organizations',
        loadChildren: () => import('./modules/organizations/organizations-routing.module').then(o => o.OrganizationsRoutingModule)
      },
      {
        path: 'system-settings',
        loadComponent: () => import('./views/super-admin/system-settings/system-settings.component').then(c => c.SystemSettingsComponent)
      }
    ]
  },
  {
    path: 'role-selector',
    loadComponent: () => import('./views/auth/role-selector/role-selector.component').then(m => m.RoleSelectorComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
