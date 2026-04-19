import { addDays, differenceInDays, format, parseISO } from "date-fns";

// =============================================================
// TYPES
// =============================================================

export type GoalMode = "cut" | "bulk";
export type PhaseType = "cut" | "bulk" | "maintenance" | "refeed";

export interface GoalConfig {
    id?: number;
    targetWeight: number;
    mode: GoalMode;
    initialIntensity: number; // negative for cut (e.g. -1000), positive for bulk (e.g. +500)
    startDate: string; // YYYY-MM-DD
    startWeight: number; // weight at goal creation
    active: boolean;
    created_at?: string;
}

export interface Phase {
    id: string;
    index: number;
    startDate: string;
    endDate: string;
    dailyCalorieTarget: number; // negative = deficit, positive = surplus
    type: PhaseType;
    durationDays: number;
}

export interface GoalDay {
    date: string;
    plannedCalories: number;
    actualCalories?: number; // actual deficit/surplus from calorie logs
    expectedWeight: number;
    actualWeight?: number; // from scale if available
    phaseId: string;
    phaseType: PhaseType;
    deviation: number; // actual - planned (positive = behind plan)
}

export interface GoalProjection {
    phases: Phase[];
    timeline: GoalDay[];
    estimatedGoalDate: string;
    totalDays: number;
    currentPhaseIndex: number;
    weightRemaining: number;
    isGoalReached: boolean;
    recalculatedFromDate?: string;
}

// =============================================================
// CONSTANTS
// =============================================================

const KCAL_PER_KG = 7700;
const PHASE_DURATION_DAYS = 28; // ~4 weeks

// Intensity constraints
const CUT_MAX_DEFICIT = -1000;
const CUT_MIN_DEFICIT = -300;
const CUT_STEP = 200; // decrease intensity by 200 each phase

const BULK_MAX_SURPLUS = 500;
const BULK_MIN_SURPLUS = 200;
const BULK_STEP = 100;

// =============================================================
// PHASE GENERATION
// =============================================================

/**
 * Clamp intensity within safe bounds based on mode.
 */
function clampIntensity(intensity: number, mode: GoalMode): number {
    if (mode === "cut") {
        // intensity is negative for cuts
        return Math.max(CUT_MAX_DEFICIT, Math.min(CUT_MIN_DEFICIT, intensity));
    } else {
        // intensity is positive for bulk
        return Math.min(BULK_MAX_SURPLUS, Math.max(BULK_MIN_SURPLUS, intensity));
    }
}

/**
 * Generate adaptive phases based on total weight to lose/gain.
 * Intensity gradually decreases over time for sustainability.
 */
export function generatePhases(
    startDate: string,
    startWeight: number,
    targetWeight: number,
    initialIntensity: number,
    mode: GoalMode
): Phase[] {
    const clampedIntensity = clampIntensity(initialIntensity, mode);
    const totalWeightChange = Math.abs(targetWeight - startWeight);

    if (totalWeightChange < 0.1) {
        // Already at target
        return [];
    }

    const phases: Phase[] = [];
    let currentIntensity = clampedIntensity;
    let accumulatedWeightChange = 0;
    let currentDate = startDate;
    let phaseIndex = 0;

    while (accumulatedWeightChange < totalWeightChange) {
        // Calculate weight change this phase would produce
        const kcalThisPhase = Math.abs(currentIntensity) * PHASE_DURATION_DAYS;
        const weightChangeThisPhase = kcalThisPhase / KCAL_PER_KG;

        // Check if we'd overshoot the target
        const remainingWeight = totalWeightChange - accumulatedWeightChange;
        let actualDuration = PHASE_DURATION_DAYS;

        if (weightChangeThisPhase >= remainingWeight) {
            // This is the last phase — calculate exact days needed
            const kcalNeeded = remainingWeight * KCAL_PER_KG;
            actualDuration = Math.ceil(kcalNeeded / Math.abs(currentIntensity));
            actualDuration = Math.max(1, actualDuration);
        }

        const phaseStartDate = currentDate;
        const phaseEndDate = format(
            addDays(parseISO(phaseStartDate), actualDuration - 1),
            "yyyy-MM-dd"
        );

        // Determine phase type
        const phaseType: PhaseType = mode === "cut" ? "cut" : "bulk";

        // Insert maintenance/refeed phases for sustainability
        // Every 3 active phases, add a 1-week maintenance/refeed
        if (phaseIndex > 0 && phaseIndex % 3 === 0 && accumulatedWeightChange < totalWeightChange * 0.9) {
            // Insert a maintenance week before this phase
            const maintenanceStart = currentDate;
            const maintenanceEnd = format(addDays(parseISO(maintenanceStart), 6), "yyyy-MM-dd");

            phases.push({
                id: `phase-${phaseIndex}-maintenance`,
                index: phaseIndex,
                startDate: maintenanceStart,
                endDate: maintenanceEnd,
                dailyCalorieTarget: 0,
                type: "maintenance",
                durationDays: 7,
            });

            currentDate = format(addDays(parseISO(maintenanceEnd), 1), "yyyy-MM-dd");
            phaseIndex++;

            // Recalculate start date for the actual phase
            const adjustedStartDate = currentDate;
            const adjustedEndDate = format(
                addDays(parseISO(adjustedStartDate), actualDuration - 1),
                "yyyy-MM-dd"
            );

            phases.push({
                id: `phase-${phaseIndex}`,
                index: phaseIndex,
                startDate: adjustedStartDate,
                endDate: adjustedEndDate,
                dailyCalorieTarget: currentIntensity,
                type: phaseType,
                durationDays: actualDuration,
            });

            currentDate = format(addDays(parseISO(adjustedEndDate), 1), "yyyy-MM-dd");
        } else {
            phases.push({
                id: `phase-${phaseIndex}`,
                index: phaseIndex,
                startDate: phaseStartDate,
                endDate: phaseEndDate,
                dailyCalorieTarget: currentIntensity,
                type: phaseType,
                durationDays: actualDuration,
            });

            currentDate = format(addDays(parseISO(phaseEndDate), 1), "yyyy-MM-dd");
        }

        // Accumulate
        const actualWeightChange = (Math.abs(currentIntensity) * actualDuration) / KCAL_PER_KG;
        accumulatedWeightChange += actualWeightChange;
        phaseIndex++;

        // Taper intensity for sustainability
        if (mode === "cut") {
            currentIntensity = Math.min(currentIntensity + CUT_STEP, CUT_MIN_DEFICIT);
        } else {
            currentIntensity = Math.max(currentIntensity - BULK_STEP, BULK_MIN_SURPLUS);
        }

        // Safety: prevent infinite loops
        if (phaseIndex > 50) break;
    }

    return phases;
}

// =============================================================
// PROJECTION ENGINE
// =============================================================

/**
 * Simulate the full weight curve from phases and actual data.
 * This is the core projection that creates the timeline.
 */
export function simulateWeightCurve(
    phases: Phase[],
    startWeight: number,
    targetWeight: number,
    calorieData: Array<{ date: string; calories_consumed: number; calories_burned: number }>,
    weightData: Array<{ date: string; weight: number }>,
    today: string
): GoalProjection {
    if (phases.length === 0) {
        return {
            phases: [],
            timeline: [],
            estimatedGoalDate: today,
            totalDays: 0,
            currentPhaseIndex: 0,
            weightRemaining: 0,
            isGoalReached: true,
        };
    }

    // Build lookup maps
    const calorieByDate = new Map(
        calorieData.map((c) => [c.date, c.calories_burned - c.calories_consumed])
    );
    const weightByDate = new Map(
        weightData.map((w) => [w.date, w.weight])
    );

    const timeline: GoalDay[] = [];
    let currentWeight = startWeight;
    let currentPhaseIndex = 0;
    let isGoalReached = false;

    const lastPhase = phases[phases.length - 1];
    const totalDays = differenceInDays(
        parseISO(lastPhase.endDate),
        parseISO(phases[0].startDate)
    ) + 1;

    for (const phase of phases) {
        const phaseStart = parseISO(phase.startDate);
        const phaseEnd = parseISO(phase.endDate);
        const phaseDays = differenceInDays(phaseEnd, phaseStart) + 1;

        for (let d = 0; d < phaseDays; d++) {
            const dateStr = format(addDays(phaseStart, d), "yyyy-MM-dd");

            // Planned calories for this day
            // Convert planned target to the same convention as actual data:
            // positive = deficit (weight loss), negative = surplus (weight gain)
            const plannedCalories = -phase.dailyCalorieTarget;

            // Check for actual data
            const actualCalories = calorieByDate.get(dateStr);
            const actualWeight = weightByDate.get(dateStr);

            // If we have a real scale reading, snap to it
            if (actualWeight !== undefined) {
                currentWeight = actualWeight;
            }

            // If we have actual calorie data for past days, use it
            const isInPast = dateStr <= today;
            let effectiveCalories = plannedCalories;

            if (isInPast && actualCalories !== undefined) {
                effectiveCalories = actualCalories;
            } else if (isInPast && actualCalories === undefined) {
                // Missing day — assume maintenance (0 change)
                effectiveCalories = 0;
            }

            // Apply weight change: positive effectiveCalories = deficit = weight goes down
            const dailyWeightChange = effectiveCalories / KCAL_PER_KG;
            currentWeight -= dailyWeightChange;

            const deviation = isInPast && actualCalories !== undefined
                ? plannedCalories - actualCalories
                : 0;

            timeline.push({
                date: dateStr,
                plannedCalories,
                actualCalories: isInPast ? actualCalories : undefined,
                expectedWeight: parseFloat(currentWeight.toFixed(2)),
                actualWeight: actualWeight ?? undefined,
                phaseId: phase.id,
                phaseType: phase.type,
                deviation,
            });

            // Track current phase
            if (dateStr <= today) {
                currentPhaseIndex = phases.indexOf(phase);
            }

            // Check if goal reached
            const mode = targetWeight < startWeight ? "cut" : "bulk";
            if (mode === "cut" && currentWeight <= targetWeight) {
                isGoalReached = true;
            } else if (mode === "bulk" && currentWeight >= targetWeight) {
                isGoalReached = true;
            }
        }
    }

    // Estimated goal date
    const goalReachedDay = timeline.find((d) => {
        const mode = targetWeight < startWeight ? "cut" : "bulk";
        if (mode === "cut") return d.expectedWeight <= targetWeight;
        return d.expectedWeight >= targetWeight;
    });

    const weightRemaining = Math.abs(currentWeight - targetWeight);

    return {
        phases,
        timeline,
        estimatedGoalDate: goalReachedDay?.date ?? lastPhase.endDate,
        totalDays,
        currentPhaseIndex,
        weightRemaining: parseFloat(weightRemaining.toFixed(2)),
        isGoalReached,
    };
}

// =============================================================
// RECALCULATION ENGINE
// =============================================================

/**
 * Recalculate the plan based on current progress.
 * Uses actual weight/calorie data to regenerate future phases.
 */
export function recalculatePlan(
    goal: GoalConfig,
    calorieData: Array<{ date: string; calories_consumed: number; calories_burned: number }>,
    weightData: Array<{ date: string; weight: number }>,
    today: string
): GoalProjection {
    // Determine current weight from the most recent data
    const sortedWeights = [...weightData]
        .filter((w) => w.date <= today)
        .sort((a, b) => a.date.localeCompare(b.date));

    let currentWeight = goal.startWeight;

    if (sortedWeights.length > 0) {
        // Use the last scale reading as baseline
        const lastScale = sortedWeights[sortedWeights.length - 1];
        currentWeight = lastScale.weight;

        // Apply calorie deficits since last scale reading
        const caloriesSinceScale = calorieData
            .filter((c) => c.date > lastScale.date && c.date <= today)
            .sort((a, b) => a.date.localeCompare(b.date));

        for (const entry of caloriesSinceScale) {
            const deficit = entry.calories_burned - entry.calories_consumed;
            currentWeight -= deficit / KCAL_PER_KG;
        }
    }

    // Regenerate phases from today with current weight
    const newPhases = generatePhases(
        today,
        currentWeight,
        goal.targetWeight,
        goal.initialIntensity,
        goal.mode
    );

    // Build full projection
    const projection = simulateWeightCurve(
        newPhases,
        currentWeight,
        goal.targetWeight,
        calorieData,
        weightData,
        today
    );

    projection.recalculatedFromDate = today;
    return projection;
}

// =============================================================
// UTILITY FUNCTIONS
// =============================================================

/**
 * Get the current phase for a given date.
 */
export function getCurrentPhase(phases: Phase[], date: string): Phase | null {
    return phases.find((p) => p.startDate <= date && p.endDate >= date) ?? null;
}

/**
 * Get daily target for a specific date.
 */
export function getDailyTarget(phases: Phase[], date: string): number {
    const phase = getCurrentPhase(phases, date);
    return phase?.dailyCalorieTarget ?? 0;
}

/**
 * Calculate how many days ahead/behind the plan the user is.
 */
export function calculatePlanDeviation(
    projection: GoalProjection,
    today: string
): { daysDeviation: number; kcalDeviation: number } {
    const pastDays = projection.timeline.filter(
        (d) => d.date <= today && d.actualCalories !== undefined
    );

    let totalPlanned = 0;
    let totalActual = 0;

    for (const day of pastDays) {
        totalPlanned += day.plannedCalories;
        totalActual += day.actualCalories ?? 0;
    }

    const kcalDeviation = totalActual - totalPlanned;
    const daysDeviation = Math.round(kcalDeviation / (projection.phases[0]?.dailyCalorieTarget || 1));

    return { daysDeviation, kcalDeviation };
}

/**
 * Format an intensity value for display.
 */
export function formatIntensity(intensity: number): string {
    if (intensity === 0) return "Maintenance";
    const sign = intensity > 0 ? "+" : "−";
    return `${sign}${Math.abs(intensity)} kcal/j`;
}
