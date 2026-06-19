import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminDashboard } from './admin-dashboard';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AdminDashboard', () => {
  let component: AdminDashboard;
  let fixture: ComponentFixture<AdminDashboard>;

  beforeEach(async () => {
    // Mock global window.alert to prevent blocking test threads
    vi.stubGlobal('alert', () => {});

    await TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [
        provideRouter([])
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle tournament status when archiveTournament is called', () => {
    // Spring Member Open is initially ACTIVE
    const targetId = 'TRN-1042';
    const originalTournament = component.tournaments.find(t => t.id === targetId);
    expect(originalTournament).toBeDefined();
    expect(originalTournament?.status).toBe('ACTIVE');

    // Archive it
    component.archiveTournament(targetId);
    expect(originalTournament?.status).toBe('ARCHIVED');

    // Restore it
    component.archiveTournament(targetId);
    expect(originalTournament?.status).toBe('ACTIVE');
  });

  it('should filter out archived tournaments when showArchived is false', () => {
    component.showArchived = false;
    
    // Archive one tournament
    component.archiveTournament('TRN-1042');

    const activeTournaments = component.getFilteredTournaments();
    expect(activeTournaments.some(t => t.id === 'TRN-1042')).toBe(false);
  });

  it('should show both archived and non-archived tournaments when showArchived is true', () => {
    component.showArchived = true;
    
    // Archive one tournament
    component.archiveTournament('TRN-1042');

    const filteredTournaments = component.getFilteredTournaments();
    expect(filteredTournaments.some(t => t.id === 'TRN-1042')).toBe(true);
    expect(filteredTournaments.some(t => t.id === 'TRN-1043')).toBe(true);
  });
});
