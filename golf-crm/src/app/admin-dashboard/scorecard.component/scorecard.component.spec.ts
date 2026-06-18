import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScorecardComponent } from './scorecard.component';

describe('ScorecardComponent', () => {
  let component: ScorecardComponent;
  let fixture: ComponentFixture<ScorecardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScorecardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScorecardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
