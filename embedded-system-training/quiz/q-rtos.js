/* RTOS: extra questions (r13 onward). Format and rules: see the header of questions.js. APPEND ONLY.
 * FreeRTOS names are used as examples: learners must check their RTOS documentation. */
window.QUIZ_ADD("rtos", [
  ["Three tasks share a mutex. Task L (low) holds it, task H (high) blocks on it, and task M (medium) becomes ready. Without priority inheritance, what happens?",
   null,
   [
     "M pre-empts L, so L cannot release the mutex and H keeps waiting",
     "H pre-empts L at once and takes the mutex, because H has the top priority",
     "The kernel aborts L so that H can run without waiting any longer",
     "The kernel releases the mutex when M becomes ready, so H is not delayed"
   ],
   "H waits for L, but L is pre-empted by M, so H effectively runs at M's priority. Priority inheritance raises L's priority while it holds a mutex wanted by H, so L finishes the critical section quickly. This is the classic failure mode of the Mars Pathfinder reset in 1997."],
  ["What is the Rate Monotonic priority assignment rule?",
   null,
   [
     "Tasks with shorter periods get higher priorities",
     "Tasks with longer periods get higher priorities, because they have more slack",
     "Tasks with the largest execution time get the highest priority",
     "Priorities are assigned in the order in which the tasks are created"
   ],
   "Rate monotonic is optimal for fixed-priority scheduling of independent periodic tasks with deadlines equal to periods. It is the basis for the utilisation bound test and for response-time analysis."],
  ["What does the Liu and Layland utilisation bound for rate monotonic scheduling say for large n?",
   null,
   [
     "Below about 69 % a set is schedulable; above it, check exactly",
     "Any set below 100 % utilisation is always schedulable with fixed priorities",
     "Any set above 50 % utilisation is certain to miss a deadline",
     "The bound is 25 % for every number of tasks and cannot be exceeded"
   ],
   "The bound n(2^(1/n) − 1) tends to ln 2 ≈ 0.693. It is sufficient, not necessary, for independent tasks with deadlines equal to periods and no blocking. Exact response-time analysis handles sets above the bound."],
  ["What is the key property of Earliest Deadline First (EDF) scheduling on a single processor?",
   null,
   [
     "The ready task with the nearest absolute deadline runs",
     "The task with the lowest priority number runs first and is never pre-empted",
     "Tasks run in a fixed cyclic order taken from a static table",
     "It never pre-empts a running task, so each job runs to completion"
   ],
   "EDF is optimal on a single processor for independent pre-emptable tasks, but under overload it behaves unpredictably (a domino effect), and many safety standards prefer fixed priorities for their simpler analysis and behaviour."],
  ["A lower-priority task has C = 2 ms, T = 10 ms. The only higher-priority task has C = 3 ms, T = 5 ms. Assuming no blocking and a simultaneous release, what is the lower task's worst-case response time?",
   null,
   [
     "5 ms, a fixed point of R = 2 + ceil(R/5)·3",
     "2 ms, because the task needs only its own execution time",
     "8 ms, because two higher-priority jobs always run before it",
     "10 ms, because it completes at the end of its period"
   ],
   "Response-time iteration R = C + ceil(R / T_hp) · C_hp: R0 = 2, then 2 + ceil(2/5)·3 = 5, then 2 + ceil(5/5)·3 = 5, a fixed point. So R = 5 ms (the second high-priority job is released at t = 5, just as the low task completes). 8 ms would count two high-priority jobs, and 2 ms ignores interference."]
]);
window.QUIZ_ADD("rtos", [
  ["Three periodic tasks are scheduled rate-monotonically with no blocking: τ1 (C = 2, T = 6), τ2 (C = 2, T = 8), τ3 (C = 3, T = 12), all in ms, deadlines equal to periods. Total utilisation is about 83 %, above the 3-task bound (about 78 %). What can be concluded?",
   null,
   [
     "The bound is inconclusive, but analysis gives τ3 = 11 ms, so it is schedulable",
     "The set is unschedulable, because utilisation exceeds the 3-task bound",
     "The set is schedulable only if EDF replaces fixed priorities",
     "τ3 has a response time of 3 ms, equal to its execution time"
   ],
   "The utilisation bound is only sufficient. Response-time analysis: R1 = 2, R2 = 4, and R3 = 3 + ceil(R/6)·2 + ceil(R/8)·2 iterates to 11 ms, which is within 12 ms."],
  ["Tasks τ1 (C = 1, T = 4), τ2 (C = 2, T = 6) and τ3 (C = 3, T = 12) run with rate-monotonic priorities. τ2 can be blocked for up to 2 ms by a lower-priority task holding a shared resource (no priority inheritance chain beyond that). What is τ2's worst-case response time, and does it meet its deadline of 6 ms?",
   null,
   [
     "6 ms: it converges at 6, meeting the deadline with no margin",
     "2 ms, because blocking time is not part of the response time",
     "8 ms, so the 6 ms deadline is missed",
     "4 ms, because the scheduler absorbs the blocking"
   ],
   "Blocking adds to the response time of the blocked task. Iteration: R = 4 → 4 + 1 = 5 → 4 + 2 = 6 → 4 + 2 = 6 (ceil(6/4) = 2). With a deadline of 6 ms there is no margin, so a small change in WCET or blocking time would break it."],
  ["Which two properties must a resource-sharing protocol such as priority ceiling give so that blocking time can be bounded for analysis?",
   null,
   [
     "One blocking by a single lower-priority critical section, no deadlock",
     "Blocking can chain through several tasks, but each wait stays short",
     "Priority inversion may last as long as the holder needs, if it runs fast",
     "Critical sections are removed from the design altogether"
   ],
   "With the immediate or original priority ceiling protocol on a single core, a task is blocked at most once, by one critical section of one lower-priority task, and deadlock cannot occur. This makes the blocking term in response-time analysis small and known."],
  ["Which of the four conditions needed for a deadlock can an ordering of resource acquisition remove?",
   null,
   [
     "Circular wait: a global lock order means no cycle can form",
     "Mutual exclusion: a global order makes the resources shareable",
     "Hold and wait: a global order forces tasks to release everything first",
     "No pre-emption: a global order lets the kernel take locks back"
   ],
   "A fixed global lock order is the standard cheap defence, and it is verifiable by review and static analysis. The other conditions are mutual exclusion, hold and wait, and no pre-emption of resources."],
  ["A task calls `xSemaphoreTake(mutex, portMAX_DELAY)` twice in a row without giving (FreeRTOS-style standard mutex). What happens?",
   null,
   [
     "It blocks itself, because a standard mutex is not recursive",
     "The second call returns at once, because the task already owns the mutex",
     "The kernel releases the first lock before the second call",
     "The scheduler restarts and both calls return an error code"
   ],
   "A standard mutex cannot be taken again by its holder. Recursive mutexes count nested takes, but they hide design issues, and safety coding rules often prefer a structure that avoids nested locking. Check your RTOS documentation."],
  ["What is the difference between a binary semaphore and a mutex in most RTOSes?",
   null,
   [
     "A mutex has an owner and usually inheritance; a semaphore only signals",
     "They are identical, and only the names differ between kernels",
     "A mutex can be given from an ISR, but a semaphore cannot",
     "A semaphore has an owner and inheritance, while a mutex has neither"
   ],
   "Use a mutex to protect shared data, and a semaphore to signal events (for example from an ISR to a task). Using a semaphore for locking gives unbounded priority inversion because there is no inheritance."],
  ["Which kernel object is the best fit for passing data from an ISR to a task with buffering and without sharing a variable?",
   null,
   [
     "A message queue, written from the ISR with the ISR-safe send function",
     "A mutex taken inside the ISR and released in the task",
     "A recursive mutex shared by the ISR and the task",
     "A priority change of the receiving task made by the ISR"
   ],
   "Queues copy data and handle synchronisation. The ISR must use the ISR variants of the API, which never block, and report whether a higher-priority task was woken so a context switch can be requested at the end of the ISR."],
  ["What does 'deferred interrupt processing' mean in an RTOS design?",
   null,
   [
     "The ISR acknowledges and captures, then signals a task to do the rest",
     "The interrupt is held off until the system is idle, then handled in one go",
     "The interrupt is ignored until a task polls the peripheral for data",
     "The interrupt always runs at the lowest hardware priority"
   ],
   "Task-level processing can use blocking calls, run under scheduler control and be analysed with normal response-time analysis. The ISR duration and the latency to the task are both part of the timing budget."],
  ["What happens if a task of the same priority as another is ready and time slicing is enabled?",
   null,
   [
     "They share the CPU in round-robin slices at each tick",
     "The task with the lower ID runs until it blocks, and the other never runs",
     "Both are suspended until an operator changes one priority",
     "Both run in parallel on a single core"
   ],
   "Time slicing is a kernel option. In hard real-time design, equal-priority tasks make timing analysis harder, so many designs give each task a unique priority."],
  ["Why can a long tick interrupt period make timing analysis more difficult?",
   null,
   [
     "Delays round to whole ticks, so release jitter can reach one tick",
     "The hardware timer is exact, so the tick has no influence on timing",
     "A longer tick improves precision, because fewer interrupts occur",
     "It only affects memory use and has no effect on timing"
   ],
   "Delay and timeout resolution is one tick, and a requested delay may be shorter by up to one tick. High-resolution timing needs hardware timers or tick configuration. Tickless idle changes when the tick runs but not the quantisation rule."],
  ["What is the purpose of tickless idle in an RTOS?",
   null,
   [
     "The tick stops while all tasks are blocked, so the MCU can sleep",
     "It removes the scheduler, so tasks run in a fixed order",
     "It raises the tick rate while idle to detect events sooner",
     "It removes all interrupts from the system when it is idle"
   ],
   "The kernel programs a wake-up for the next timeout, and corrects the tick count after waking. The wake-up latency and the clock source accuracy in low-power mode need analysis."],
  ["What is the typical problem with calling a blocking RTOS API from inside a critical section (interrupts disabled)?",
   null,
   [
     "The scheduler cannot run with interrupts off, so the call may hang",
     "The call runs faster inside a critical section, so it is encouraged",
     "The call is always allowed inside a critical section",
     "The kernel raises the tick rate while the call is waiting"
   ],
   "Blocking requires a context switch, which depends on interrupts. RTOS documentation lists which calls are legal in critical sections, and in ISRs. Use the appropriate API and keep sections short."],
  ["On Cortex-M with FreeRTOS-style ports, a stack overflow check by pattern (`configCHECK_FOR_STACK_OVERFLOW` method 2) runs when?",
   null,
   [
     "It runs at context switch, so an overflow that recovers between switches can be missed",
     "It runs at every instruction, so no overflow can be missed",
     "It runs only once at power-up, before the tasks start",
     "It runs on every tick, so every overflow is caught"
   ],
   "Software stack checks are sampled at certain points. Hardware stack-limit or MPU guard regions detect the overflow at once. Use the check as a diagnostic, and size the stack with analysis."],
  ["Which task stack sizing method is appropriate for a certified system?",
   null,
   [
     "Static worst-case analysis of call graph, checked by measured margins",
     "A first estimate, increased whenever the system fails in test",
     "A fixed 1 KB per task, because that suits typical tasks",
     "The default stack size that ships with the RTOS"
   ],
   "Measured high-water marks only cover executed paths. Analysis gives a bound, and measurement checks it. The margin and the method belong to the verification evidence."],
  ["A software timer callback in FreeRTOS-style kernels runs in which context?",
   null,
   [
     "In the timer service task, so it must not block",
     "In the tick interrupt handler, so it must be very short",
     "In the idle task, whenever nothing else is ready",
     "In the task that created the timer, at its next run"
   ],
   "Callbacks run in the daemon task and are queued as commands through a queue. Long callbacks delay other timers, and blocking in a callback blocks the daemon. Details vary between RTOSes."],
  ["A high-priority task polls with `vTaskDelay(1)` expecting a 1 ms period. The tick is 1 ms. What is the problem?",
   null,
   [
     "The delay starts at the call, so execution time adds up as drift; use delay-until",
     "There is no problem, because the period stays exactly 1 ms",
     "The task runs faster than needed, because the delay is rounded down",
     "The tick is shorter than the delay and is ignored"
   ],
   "A relative delay adds to the time spent running and to scheduling jitter, so the period is longer than intended. Absolute delay functions (such as `vTaskDelayUntil`) keep a fixed release time base."],
  ["A task misses its deadline occasionally only when another task logs to a serial port. What is a likely design cause?",
   null,
   [
     "The logging path holds a lock or runs at a higher priority",
     "The serial port runs too fast for the task and overruns",
     "The compiler removed the task when logging was enabled",
     "The ADC samples too quickly while the port is busy"
   ],
   "Shared resources such as a console or heap are a common hidden coupling between tasks. The analysis must include such blocking, or logging must be decoupled through a bounded queue and a low-priority task."],
  ["What does 'bounded execution time' for an RTOS service call mean to a certification reviewer?",
   null,
   [
     "A worst-case time can be shown that does not rely on unbounded loops",
     "The call never returns to the caller, so it takes no time",
     "The call is fast on average, which is enough for the analysis",
     "The call costs no CPU time because the kernel runs in hardware"
   ],
   "Timing analysis needs worst-case figures. Some kernels have O(n) operations (for example sorted list insertion), where n is the number of tasks. These must be bounded by the configuration."],
  ["Which statement about using `malloc` inside a task of an RTOS is correct for a safety system?",
   null,
   [
     "Its time varies, it can fragment and it can fail at run time",
     "It is the preferred way to create every kernel object",
     "It cannot fail on a small system, so the result need not be checked",
     "It is always faster than static allocation"
   ],
   "Static allocation of tasks, queues and buffers is the typical approach. If dynamic allocation is used at all, it is limited to start-up with checked results."],
  ["Which statement describes an 'idempotent' command in a task-to-task message design?",
   null,
   [
     "Executing it twice has the same effect as once",
     "It always fails when it is executed a second time",
     "It can only be sent once per system start",
     "It changes the priority of the receiving task when repeated"
   ],
   "Idempotent operations (set the state to X) tolerate retries and duplicates, unlike relative ones (increase by 1). Preferring absolute commands simplifies fault-tolerant message handling."],
  ["Why is it unsafe to read a multi-word structure shared between a task and an ISR without protection?",
   null,
   [
     "The ISR can update it half-way through the read",
     "Structures are always read atomically on 32-bit cores",
     "The compiler locks every structure automatically while it is read",
     "The structure may be moved in memory during the read"
   ],
   "Use a critical section, a lock-free double buffer or a sequence-counter scheme. Declaring the struct volatile does not make multi-word access atomic."]
]);
window.QUIZ_ADD("rtos", [
  ["In a cyclic executive with a minor frame of 10 ms and a major frame of 40 ms, a task has a period of 20 ms. How is it scheduled?",
   null,
   [
     "It sits in every second minor frame of the static table",
     "It runs in minor frames chosen at random by the scheduler",
     "It is created dynamically when its period expires",
     "It runs in every minor frame, at twice its required rate"
   ],
   "A cyclic executive repeats a fixed table. Periods are multiples of the minor frame and divide the major frame, and execution budgets are checked per frame. A task that overruns the frame is detected by a frame-overrun check and handled by the defined fault policy."],
  ["What is the typical rule for choosing the minor frame length of a cyclic executive?",
   null,
   [
     "It divides the major frame and every task period is a multiple of it",
     "It is always 1 s, whatever the task periods are",
     "It equals the shortest task's WCET, so no task is split",
     "It is chosen at random for each build to spread the load"
   ],
   "A frame length must make a valid, repeatable table. Long tasks may need to be split into slices, which complicates the design. This is the cost for the simplicity and predictability of the approach."],
  ["What is a disadvantage of a pure cyclic executive compared with a pre-emptive priority-based scheduler?",
   null,
   [
     "It is less flexible: timing changes need a rebuilt table",
     "It is less deterministic, because tasks run in a variable order",
     "It cannot run periodic tasks, only one-off jobs",
     "It needs dynamic memory for the schedule table"
   ],
   "Its advantages are determinism and easy analysis, and no context-switch or priority-inversion issues. The price is the rigid design and effort to maintain the table."],
  ["In ARINC 653, what is a 'major time frame'?",
   null,
   [
     "The repeating cycle in which each partition gets its configured windows",
     "The stack area that a partition reserves for its processes",
     "A memory region that only the module may write",
     "A message queue that connects two partitions"
   ],
   "The module-level schedule is a static table of partition windows repeated every major frame. Within a window, the partition's own scheduler runs its processes. The windows are the basis for time partitioning."],
  ["In ARINC 653, what happens to a partition's processes when its window ends while a process is still running?",
   null,
   [
     "The module scheduler pre-empts it and its processes resume next window",
     "The process keeps running into the windows of other partitions",
     "All processes of the partition are deleted at the end of the window",
     "The module halts until the running process finishes"
   ],
   "Strict time partitioning means a partition cannot use another's time. Pre-emption at the window boundary is enforced by the module-level scheduler, which is what makes the partitions independent in the time domain."],
  ["Why are ARINC 653 partitions given separate memory spaces enforced by hardware (MMU/MPU)?",
   null,
   [
     "A fault in one partition cannot corrupt the code or data of another",
     "The partitions can then run at a higher tick rate",
     "The partitions then no longer need interrupts",
     "The partitions then need less code memory"
   ],
   "Spatial partitioning is checked by the hardware on every access. It is the basis for the claim that software of different criticality levels can share one processor, as in the DO-178C notion of robust partitioning (the claim needs an assurance argument)."],
  ["What is the main difference between a process in ARINC 653 and a partition?",
   null,
   [
     "A partition is the protected unit; processes run inside it",
     "They are the same thing under two names",
     "A process contains several partitions that share its memory",
     "Partitions exist only to handle I/O devices"
   ],
   "Partitions are isolated from each other, while processes within one partition share its address space and are scheduled by the partition's own priority-based scheduler during its windows."],
  ["A multicore processor runs two partitions on different cores. Which effect can break time partitioning even though each core has its own schedule?",
   null,
   [
     "Interference on shared resources such as the cache and memory controller",
     "The different colours of the status LEDs on each core",
     "The number of cores on the chip",
     "The use of C instead of assembly on one core"
   ],
   "Shared hardware resources cause timing coupling between cores. CAST-32A / AMC 20-193 style guidance asks for the interference to be identified, mitigated and verified. Verify the current guidance documents for your project."],
  ["Which approach to multicore interference is commonly used to improve predictability?",
   null,
   [
     "Partition shared resources, for example cache colouring, and measure the rest",
     "Ignore it, because it averages out over a long run",
     "Double the clock frequency so interference matters less",
     "Add more tasks so that the load is shared evenly"
   ],
   "Mitigation reduces the interference channel, and the remaining effect is bounded by analysis or by stress tests that deliberately load the other cores. The argument belongs in the project's multicore documentation and plans."],
  ["What is asymmetric multiprocessing (AMP) compared with symmetric multiprocessing (SMP)?",
   null,
   [
     "AMP runs a separate OS image per core; SMP runs one OS on all cores",
     "AMP uses only one core, while SMP uses all of them",
     "SMP runs without any operating system, AMP needs one",
     "They are identical and differ only in name"
   ],
   "AMP gives clearer separation and simpler analysis of each core, while SMP has more shared kernel state and more potential for locking interactions. Safety projects often prefer AMP or static task-to-core binding."],
  ["What is a spin lock, and where is it suitable?",
   null,
   [
     "A core busy-waits until the lock is free, so only short sections suit it",
     "A mutex that uses priority inheritance to bound the waiting",
     "A lock that puts the waiting task to sleep until it is free",
     "A lock that is held by the idle task while nothing else runs"
   ],
   "On a single core a spinning task can wait for a holder that cannot run (the holder is pre-empted), so the system hangs. On multicore, spin locks must keep the hold time bounded and often disable local interrupts."],
  ["What is WCET analysis by measurement-based methods missing compared with static analysis?",
   null,
   [
     "Guaranteed coverage of the worst path; a measured maximum is a lower bound",
     "Any measurement of time on the target",
     "Knowledge of which compiler version was used",
     "The use of a hardware timer for the measurement"
   ],
   "Measurement shows what happened, not the worst case. Static analysis uses a hardware model and path analysis to give a safe bound, with its own risk if the model is wrong. Hybrid methods combine them. Reviewers want a justification either way."],
  ["Which factor makes WCET analysis of a processor with caches and pipelines hard?",
   null,
   [
     "Instruction time depends on cache, pipeline and predictor history",
     "Instructions always take exactly one cycle on such processors",
     "The compiler removes the cache from the program when it optimises",
     "Interrupts are not allowed on processors with caches"
   ],
   "Timing anomalies mean that a local best case (such as a hit) can lead to a globally worse outcome. Some safety projects disable or lock caches, or use simple cores to keep analysis tractable."],
  ["What is a sporadic task?",
   null,
   [
     "A task released by events with a guaranteed minimum inter-arrival time",
     "A task that is released once and then never runs again",
     "A task whose priority is chosen at random at each release",
     "A task released by events with no limit on their frequency"
   ],
   "Sporadic tasks can be analysed like periodic ones using the minimum inter-arrival time. If the minimum cannot be guaranteed (for example an external interrupt), the design must enforce it, for example with an interrupt rate limiter."],
  ["Why should an interrupt source with an unbounded rate (for example a noisy input pin) be rate-limited?",
   null,
   [
     "Noise or a fault could flood the CPU with interrupts and starve tasks",
     "Interrupts can only occur once between two resets",
     "It reduces the flash size of the interrupt vector table",
     "It increases the baud rate of the serial port"
   ],
   "The analysis assumes a maximum arrival rate. Hardware filtering, masking the source after N events, or a minimum-interval check enforces the assumption."],
  ["What is the purpose of an RTOS idle task hook function, and what must it not do?",
   null,
   [
     "It runs when no other task is ready, and must never block",
     "It runs at the highest priority, so it must be short",
     "It may call any blocking API, because nothing else is waiting",
     "It replaces the scheduler while no task is ready"
   ],
   "The kernel needs at least one runnable task. A blocking call in the idle hook can leave the system with nothing to run. Typical uses are low-power entry, stack checks and housekeeping that is short."],
  ["Which of the following is a valid reason to set a task's priority higher than that of a task with a shorter period?",
   null,
   [
     "A criticality need, if analysis shows all deadlines are still met",
     "The task has a more descriptive name than the others",
     "To increase the RAM use of the system",
     "To disable the tick while the task runs"
   ],
   "Rate-monotonic assignment is optimal only under its assumptions (for example deadlines equal to periods). Deadline-monotonic or criticality-based orderings can be used if the schedulability analysis covers them."],
  ["What does 'mixed criticality' mean in a scheduling context?",
   null,
   [
     "Tasks of different levels share a CPU; low-level faults must not spread",
     "Tasks that mix floating-point and integer arithmetic",
     "A scheduler that uses two different clocks",
     "A task that mixes hardware and software work"
   ],
   "Isolation (in time and space) and analysis at the right level protect the high-criticality tasks. Without it, all software would be developed to the highest level."],
  ["In an RTOS with a 1 ms tick, a task must run every 5 ms with at most 100 µs release jitter. Why is the tick-based `delay` alone not enough?",
   null,
   [
     "Tick quantisation and latency give up to 1 ms of jitter",
     "The tick is accurate to 1 microsecond, so nothing extra is needed",
     "The jitter is always zero, because the kernel is deterministic",
     "A task cannot run every 5 ms on a 1 ms tick"
   ],
   "The release can be late by up to one tick plus scheduling latency. Use a hardware timer interrupt to release the task (or to capture the sampling instant) when jitter requirements are tighter than the tick."],
  ["A high-priority task busy-waits on a flag that only a lower-priority task will set. What happens on a single core?",
   "while (flag == 0) { /* poll */ }",
   [
     "The lower task never gets the CPU, so the flag is never set",
     "The kernel lowers the waiting task's priority automatically",
     "The hardware sets the flag after one tick",
     "Both tasks run in parallel and the flag is set at once"
   ],
   "A pre-emptive fixed-priority scheduler never runs a lower-priority task while a higher-priority one is ready, and a polling task is always ready. Block on a semaphore, queue or event instead, so the CPU is given away while waiting."],
  ["Which RTOS feature should be disabled or controlled in a design that must have a fully static, analysable behaviour?",
   null,
   [
     "Dynamic creation and deletion of tasks and objects at run time",
     "Fixed priorities that never change at run time",
     "Static memory allocation at start-up only",
     "Compile-time configuration of the kernel options"
   ],
   "A fixed set of tasks and objects created at initialisation gives a known worst case. Dynamic creation changes memory and timing during operation and complicates verification."]
]);
window.QUIZ_ADD("rtos", [
  ["What does `configMAX_SYSCALL_INTERRUPT_PRIORITY` (FreeRTOS Cortex-M ports) define?",
   null,
   [
     "The most urgent priority from which ISRs may call `FromISR` functions",
     "The priority that the idle task runs at",
     "The maximum number of tasks the kernel can create",
     "The frequency of the tick interrupt"
   ],
   "Interrupts more urgent than this threshold are never masked by kernel critical sections, so they can have very low latency but must not call kernel functions. Getting the priority number direction wrong is a classic port configuration error. Check the port documentation."],
  ["In a kernel with priority inheritance, task L (priority 1) holds a mutex and task H (priority 5) blocks on it. What priority does L run at until it gives the mutex?",
   null,
   [
     "5, inherited from H while L holds the mutex",
     "1, because inheritance is only a flag in the kernel",
     "0, the lowest priority, so L finishes last",
     "The priority of the idle task"
   ],
   "L is temporarily raised to the priority of the highest-priority task waiting for the mutex. It drops back once it releases it (or, with several mutexes, to the highest remaining inherited priority)."],
  ["What limitation does priority inheritance have compared with the immediate priority ceiling protocol?",
   null,
   [
     "Chained blocking and lock-order deadlock remain possible",
     "It cannot be used on a single core",
     "It needs no kernel support, so it is less safe",
     "It raises all task priorities permanently"
   ],
   "Inheritance alone can leave a task blocked by several tasks in a chain, and it does not prevent lock-order deadlocks. The ceiling protocol assigns each resource a ceiling priority so these cannot happen, at the price of needing to know the users of each resource in advance."],
  ["A task blocked on a queue receive with a timeout of `portMAX_DELAY` never wakes up, though another task sent to the queue. Which is the most likely cause?",
   null,
   [
     "The sender used another queue handle, or ignored a failed send",
     "The tick was running too fast for the timeout",
     "Queues cannot wake a blocked task",
     "Task priorities cannot change while a task is blocked"
   ],
   "Check the return values of the send calls and queue handles. A lost handle (for example an uninitialised or shadowed variable) is a common cause. Static analysis and the rule of checking return values help."],
  ["Why is it preferable to use event flags or task notifications rather than a shared global flag polled by a task?",
   null,
   [
     "They block the waiting task without CPU use and wake it at once",
     "Global flags are not allowed in C",
     "Notifications are slower than polling a flag",
     "A global flag is atomic automatically, so it needs no kernel support"
   ],
   "A polled flag needs a delay loop, adding latency and consuming CPU, and needs volatile and atomicity care. Kernel mechanisms give a deterministic wake-up and defined semantics."],
  ["Which statement about calling `xQueueSend` from an ISR in FreeRTOS is correct?",
   null,
   [
     "The ISR must use the `FromISR` variant, because a normal call may block",
     "Both variants are interchangeable, and only the names differ",
     "The normal variant is faster in an ISR, so it is preferred",
     "Queues cannot be used from an ISR at all"
   ],
   "ISR-safe variants never block and report whether a higher-priority task was unblocked. The ISR then requests a context switch at the end if needed. Misusing the task-level API in an ISR is a defect an RTOS-aware static check can catch."],
  ["Which approach makes a periodic task's deadline miss visible at run time?",
   null,
   [
     "Compare completion time with the deadline, then run the defined recovery",
     "Ignore it, because analysis already proved every deadline",
     "Raise the priority of all tasks until the miss disappears",
     "Reboot the system once every hour"
   ],
   "Run-time monitoring of execution time and deadlines is a safety mechanism: it detects overruns that analysis missed. The response (log, degrade, restart a partition) must be specified."],
  ["What is 'execution time budgeting' in a safety-critical RTOS?",
   null,
   [
     "The kernel measures each task's CPU use per period and flags overruns",
     "The kernel charges each task for the memory it uses",
     "The kernel sets the tick period of each task from its cost",
     "The kernel increases the stack of tasks that run longer"
   ],
   "Budget enforcement provides temporal isolation: an overrunning task cannot starve others. It is available in some safety kernels and in ARINC 653 time windows."],
  ["What is the main function of a hypervisor or separation kernel in a mixed-criticality system?",
   null,
   [
     "It enforces spatial and temporal isolation using hardware support",
     "It provides a graphical interface for the guests",
     "It compiles the guest software at start-up",
     "It removes the need for requirements on the guests"
   ],
   "A small kernel that enforces partitioning can be assured to a high level, so the partitions above it need only their own assurance level, provided the isolation argument holds."],
  ["A kernel service has a worst-case execution time that grows with the number of ready tasks (for example insertion into a sorted ready list). What must a project do?",
   null,
   [
     "Bound the number of tasks and use that worst case, or choose O(1)",
     "Ignore it, because the cost averages out over many runs",
     "Increase the number of tasks to even out the cost",
     "Remove the scheduler and run the tasks from a loop"
   ],
   "Timing analysis needs a bound. Many kernels document their complexity, so verify it for the version in use. Configuration limits (for example maximum tasks) are part of the verified settings."],
  ["Why is calling a function through a pointer (for example task entry or callback) a concern for static stack and WCET analysis?",
   null,
   [
     "The target is unknown statically, so the analyser needs the possible targets",
     "Pointers are always null in embedded code",
     "Functions cannot be called through pointers in C",
     "A call through a pointer always uses less stack"
   ],
   "Annotations or analysis of the pointer assignments supply the targets. The same issue affects coverage analysis and call graphs. Minimising indirect calls makes analysis easier."],
  ["What should a task do if a queue send with a timeout fails because the queue is full (FreeRTOS-style `errQUEUE_FULL`)?",
   null,
   [
     "Follow the defined overflow policy and do not block for ever",
     "Retry in a tight loop until the send succeeds",
     "Delete the sending task so the queue can drain",
     "Assume the message was sent and continue"
   ],
   "A full queue is a timing or design problem. The requirement defines which data may be dropped, and a counter of drops gives evidence during testing."],
  ["What is the effect of time-slicing equal-priority tasks on a control task's jitter?",
   null,
   [
     "The control task can be delayed by a slice per equal-priority task",
     "There is no effect on the control task",
     "It removes all jitter from the control task",
     "It affects only memory use, not timing"
   ],
   "Time slicing at a task's own priority adds waiting for other tasks to finish their slices. Safety-related control tasks normally have unique priorities with no slicing."],
  ["Which statement about the RTOS tick interrupt priority on Cortex-M is correct?",
   null,
   [
     "It is normally the lowest priority, so it never delays other interrupts",
     "It must be the highest priority, so the tick is never late",
     "It is always disabled while tasks run",
     "It must equal the priority of PendSV and SVC"
   ],
   "The tick and PendSV are normally at the lowest urgency in common ports, so the scheduler runs only when no other exception is active. Check the port's documentation for the exact requirement."],
  ["Why might a project forbid the use of `vTaskSuspendAll()`-style scheduler locking in application code?",
   null,
   [
     "It delays higher-priority tasks for an unbounded time if misused",
     "It speeds up every task that runs while it is active",
     "It is not available in any RTOS",
     "It disables the tick permanently"
   ],
   "Scheduler lock is a global blocking mechanism that every task is exposed to. If it is allowed, its maximum duration must be bounded and accounted for as blocking."],
  ["Which of the following is a typical cause of a task starving at a lower priority in a correctly built system?",
   null,
   [
     "Higher-priority tasks use all the CPU, which analysis would show",
     "A missing semicolon in the task body",
     "Too much flash used by the kernel",
     "A low clock frequency selected in the debugger"
   ],
   "Starvation is a consequence of fixed priorities when the load is too high or an overrun occurs. Analysis plus budget monitoring detect it."],
  ["What does a 'health monitoring' function typically do in a partitioned RTOS?",
   null,
   [
     "It detects faults and applies a configured recovery action",
     "It monitors the physical health of the crew",
     "It counts task switches and reports the total",
     "It measures the temperature of the processor"
   ],
   "The health monitor maps each detected error to an action by a configuration table. This table is part of the verified configuration and its actions need tests (fault injection)."],
  ["Which approach keeps a safety-critical application portable across RTOSes yet analysable?",
   null,
   [
     "Use a thin abstraction layer with a small, specified service set",
     "Use every feature of the RTOS freely in the application",
     "Hard-code the RTOS calls everywhere for speed",
     "Avoid any layering, so there is nothing extra to verify"
   ],
   "A narrow, defined interface limits the services whose behaviour must be understood and tested, and it eases a later change of kernel. The layer itself is software to be verified."],
  ["What is a 'race condition' in an RTOS application?",
   null,
   [
     "The result depends on unpredictable timing of tasks and interrupts",
     "A competition between two programmers over one function",
     "A task that runs faster than its deadline",
     "A processor that runs at a high clock speed"
   ],
   "Races appear only for specific timings, so testing alone often misses them. Prevent them through design (ownership, locking order, message passing) and review them with analysis tools."],
  ["Why is testing alone insufficient to show absence of race conditions?",
   null,
   [
     "The faulty interleaving may be too rare for a test to produce",
     "Tests never run on a target",
     "Tests are always perfect, so races appear in every run",
     "Races are always visible in the first run"
   ],
   "Absence of races is shown by design arguments (protection rules checked in review) and static analysis, backed by stress tests. A passing test suite is only evidence for the interleavings it exercised."],
  ["Which of the following correctly describes dispatch latency?",
   null,
   [
     "The time from an event making a task ready until it runs",
     "The time needed to compile the task",
     "The period of the tick interrupt",
     "The time needed to boot the system"
   ],
   "Dispatch latency is a key quantity for response-time analysis. It must be measured or bounded for the specific configuration, because it depends on masked-interrupt durations, scheduler locks and ISR execution."]
]);
window.QUIZ_ADD("rtos", [
  ["Two tasks each take mutex A then mutex B in opposite orders. What failure can occur and what is the fix?",
   null,
   [
     "Deadlock when each task holds one mutex and waits for the other",
     "Stack overflow; fix it with a bigger stack",
     "Tick overflow; fix it with a faster tick",
     "Priority inversion only; fix it with a higher tick rate"
   ],
   "Opposite order gives a circular wait. A fixed acquisition order removes it. Timeouts on lock waits detect the symptom but do not remove the cause."],
  ["What is the tick count overflow problem, and how is it handled in correct code?",
   null,
   [
     "A 32-bit tick wraps after about 49.7 days at 1 kHz",
     "Tick counters never wrap, because the kernel handles the overflow",
     "It resets the CPU when the counter reaches its maximum",
     "It only occurs in 8-bit systems"
   ],
   "At 1000 ticks/s a 32-bit counter wraps after 2^32 ms ≈ 49.7 days. Unsigned subtraction gives the right elapsed time across one wrap as long as the interval is shorter than the full counter range. Test with the counter initialised near the wrap value."],
  ["Which test technique best finds timing problems around tick wrap-around?",
   null,
   [
     "Start the tick counter near its maximum and run across the wrap",
     "Wait 49 days in every test run",
     "Read the code once and assume the wrap is handled",
     "Test only with the debugger disconnected"
   ],
   "Controlling the initial value makes the rare event happen in minutes. The test build must differ from the product only in that initial value, and the difference is documented."],
  ["A periodic 10 ms task reads a sensor and runs a control algorithm. Occasionally the output is stale by one cycle. Which design issue is most likely?",
   null,
   [
     "Its release and the sensor update are not synchronised",
     "The compiler is old and generates wrong code",
     "The stack is too large for the task",
     "The source file has too many comments"
   ],
   "End-to-end latency depends on the phase between producer and consumer. Define the data-age requirement, and synchronise with a trigger or a defined order of execution."],
  ["What does the term 'harmonic periods' mean, and why does it help scheduling?",
   null,
   [
     "Each period is an integer multiple of every shorter period",
     "Periods whose lengths are related by musical intervals",
     "Periods whose lengths are chosen at random",
     "Periods whose lengths are prime numbers"
   ],
   "With harmonic periods, rate-monotonic scheduling can be schedulable up to full utilisation (for independent tasks with deadlines equal to periods and no blocking). It is a design choice in many avionics systems."],
  ["A system has two sensors read at 10 ms and 15 ms. What is the hyperperiod (major cycle) of a cyclic schedule covering both?",
   null,
   [
     "30 ms, the least common multiple of 10 and 15",
     "25 ms, the sum of the two periods",
     "150 ms, the product of the two periods",
     "5 ms, the greatest common divisor"
   ],
   "The LCM of 10 and 15 is 30. The minor frame must divide this (5 ms works here), and the table repeats every 30 ms. Periods with large LCMs lead to long schedule tables."],
  ["What does the 'deadline' of a task represent compared with its 'period'?",
   null,
   [
     "The latest time after release by which the job must complete",
     "The time at which the job starts after its release",
     "The stack size reserved for the task",
     "The priority assigned to the task"
   ],
   "Deadline-monotonic assignment generalises rate-monotonic assignment to deadlines shorter than periods. The response-time test compares the response time with the deadline."],
  ["A job's response time is 8 ms and its deadline is 10 ms; its WCET estimate later increases by 25 %. What is the key question to ask?",
   null,
   [
     "Whether response-time analysis still shows all deadlines met",
     "Nothing, because 25 % of 8 ms still fits in the 10 ms deadline",
     "Only whether the memory is still enough",
     "Whether the debugger still works"
   ],
   "A higher WCET raises the task's own execution and the interference it causes on lower-priority tasks. Re-run the analysis for the whole task set rather than checking one task."],
  ["What does 'jitter' mean for a periodic task?",
   null,
   [
     "The variation of actual release or completion times from the ideal ones",
     "The size of the stack that the task uses",
     "The amount of RAM that the task uses",
     "The programming language of the task"
   ],
   "Release jitter affects response times, and output jitter affects control quality. Both are bounded by design and measured in test."],
  ["What is 'sampling jitter' in a digital control loop and why does it matter?",
   null,
   [
     "Variation in the time between samples, acting like phase error",
     "The resolution of the ADC",
     "The length of the sensor cable",
     "The time needed to compile the control code"
   ],
   "Controllers are designed for a fixed sample period. Unwanted variation degrades performance, so sampling should be triggered by hardware timers rather than by software delays."],
  ["Why is a watchdog refresh inside a timer interrupt handler a poor design?",
   null,
   [
     "The interrupt can run while the tasks are hung, so the failure is missed",
     "Interrupts cannot refresh watchdogs on any MCU",
     "The refresh uses too much flash",
     "The refresh increases the tick rate"
   ],
   "The refresh must depend on the health of the monitored tasks, such as progress counters or checked deadlines. A refresh from an interrupt only proves that interrupts work."],
  ["A health supervisor task checks that each monitored task reported within its allowed window before refreshing the watchdog. What additional weakness remains?",
   null,
   [
     "A task could report in without doing its real work",
     "Nothing, because a supervisor is perfect",
     "Supervisor tasks cannot run beside application tasks",
     "The watchdog must be disabled when a supervisor is used"
   ],
   "Alive indications are weak unless they depend on the work being done. Combining checkpoints, sequence numbers and plausibility checks makes the supervision meaningful."],
  ["Which of the following best describes an RTOS 'event group' (or flags) object?",
   null,
   [
     "A set of bits that tasks wait on (any or all)",
     "A queue that carries messages between tasks",
     "A memory pool of fixed-size blocks",
     "A table that holds the priorities of tasks"
   ],
   "Event groups let a task wait for a combination of conditions. They broadcast to all waiters, unlike a semaphore. Check the kernel's rules for ISR use and for the number of usable bits."],
  ["What is a typical risk of using direct task notifications as a binary semaphore replacement?",
   null,
   [
     "Only one value is stored per task, so repeated events can merge",
     "Notifications can never wake a blocked task",
     "Notifications use a lot of RAM per task",
     "Notifications always require a mutex"
   ],
   "A notification acts like a lightweight semaphore for one task, and repeated gives before a take may merge. Use counting mechanisms or queues if every event must be handled."],
  ["Which method is correct to ensure that two tasks never access the same peripheral at the same time?",
   null,
   [
     "Give the peripheral one owner task served by a queue, or use a mutex",
     "Declare the peripheral register `static`",
     "Use a higher tick rate so accesses rarely overlap",
     "Use a bigger stack for each calling task"
   ],
   "A gatekeeper task avoids locks at the callers and serialises access. A mutex works when the access is short and bounded, and priority inheritance limits inversion."],
  ["What is the purpose of the RTOS configuration `configASSERT()` (or similar) in a delivered safety product?",
   null,
   [
     "It is a defensive check; the project must define the failure response",
     "It improves the speed of the kernel",
     "It is only used by the compiler, not by the kernel",
     "It must always be removed from the product without analysis"
   ],
   "A default assert may loop forever or call a debug hook. In a product, the failure response must be specified and tested. Removing asserts changes the verified software, so the decision is a controlled change."],
  ["A kernel upgrade (for example from version X to X+1) is proposed late in a certification project. What is the right attitude?",
   null,
   [
     "Treat it as a change: assess impact and repeat affected verification",
     "Upgrade freely, because kernels are always compatible between versions",
     "Skip testing, because the vendor has tested the new version",
     "Skip documentation, because the configuration is unchanged"
   ],
   "Every change to certified software needs impact analysis, regression verification and configuration control. Third-party kernels need their release notes and problem reports reviewed too."],
  ["What does the term 'determinism' mean for an RTOS in a safety context?",
   null,
   [
     "The same inputs and timing give the same bounded, analysable behaviour",
     "The RTOS runs fast on average",
     "The RTOS offers many features",
     "The RTOS uses random numbers to schedule tasks"
   ],
   "Determinism does not mean speed. It means the behaviour can be predicted and shown by analysis and test, which is why designers limit features such as dynamic allocation and unbounded loops."],
  ["Which statement about using a commercial off-the-shelf (COTS) RTOS in DO-178C software is most accurate?",
   null,
   [
     "It is part of the airborne software and needs verification or evidence",
     "COTS software is exempt from DO-178C",
     "Only the application needs verification",
     "The RTOS needs no requirements because it is third-party"
   ],
   "DO-178C addresses previously developed and COTS software through the plans and the integration process. Reuse arguments depend on the evidence available and the authority's agreement, which should be settled in the PSAC."],
  ["What is a sound reaction when an RTOS service returns an unexpected error code at run time in a Level A function?",
   null,
   [
     "Handle it by the specified error policy, log it, and test the handler",
     "Ignore it, because kernel calls rarely fail",
     "Assume success and continue with the next call",
     "Disable the check in the final build only"
   ],
   "Error returns from kernel calls are part of the interface behaviour. Unhandled errors are a coverage and robustness gap. The policy belongs in the requirements."]
]);
