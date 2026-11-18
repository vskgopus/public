/* DO-178C: extra questions (d13 onward). Format and rules: see the header of questions.js. APPEND ONLY.
 * Summaries only, never RTCA text. No objective counts or TQL tables: learners must check the primary documents. */
window.QUIZ_ADD("do178c", [
  ["Which failure-condition classification corresponds to software Level A in DO-178C?",
   null,
   [
     "Catastrophic, the failure condition assigned to Level A",
     "Hazardous, a failure condition one step less severe than Level A",
     "Major, a failure condition with a significant effect on safety",
     "Minor, a failure condition with only a slight effect"
   ],
   "Level A = catastrophic, B = hazardous, C = major, D = minor, E = no safety effect. The classification comes from the system safety assessment (for example ARP4761 methods), not from the software team."],
  ["What is the 'no safety effect' level of DO-178C and what does it require from the DO-178C objectives?",
   null,
   [
     "Level E: no objectives apply, but the safety process must justify the classification",
     "Level E: only statement coverage is required, with no independence",
     "Level E: all objectives apply, since any software may affect the aircraft",
     "Level E: only the plans apply, and the authority approves them"
   ],
   "Software whose failure has no effect on safety is outside the DO-178C objectives, but that conclusion must come from the system safety assessment and be agreed with the authority."],
  ["Which document set describes the DO-178C software life cycle processes at the planning stage, as agreed with the certification authority?",
   null,
   [
     "The PSAC plus the supporting development, verification, CM and QA plans and standards",
     "The software test results together with the coverage reports",
     "The source code with its design comments and the review records",
     "The equipment user manual and the installation instructions"
   ],
   "The plans and standards define how the objectives will be met, and the PSAC is the main document for agreement with the authority. Changes in approach later need an update and renewed agreement."],
  ["What does the Software Accomplishment Summary (SAS) provide?",
   null,
   [
     "A final summary of how the plans were followed and the objectives met",
     "A first design overview that the authority approves before coding starts",
     "A table of every requirement with the test case that covers it",
     "A record of the tool licences and compiler versions that were used"
   ],
   "The SAS is the final compliance statement and overview of the evidence, together with the Software Configuration Index that identifies the exact items delivered."],
  ["What is the role of the Software Configuration Index (SCI)?",
   null,
   [
     "It identifies the delivered configuration so the baseline can be reproduced",
     "It lists the requirements allocated to the software and their status",
     "It stores the test scripts and the expected results for each test",
     "It records the qualification status of every tool in the project"
   ],
   "Exact identification is essential for later changes, investigation and re-use. Configuration management controls what goes into the baseline and how changes are recorded."],
  ["What is the difference between a high-level requirement and a low-level requirement in DO-178C?",
   null,
   [
     "High-level requirements say what the software does; low-level ones allow coding",
     "They are one document under two names, split only for review convenience",
     "Low-level requirements describe the target hardware, high-level ones the software",
     "High-level requirements are written by testers to define the test cases"
   ],
   "The decomposition chain is system requirements to software high-level requirements to software architecture and low-level requirements to source code. Each step is traceable and verified by review and test."],
  ["What is a derived requirement?",
   null,
   [
     "A requirement added by development with no parent, which must go to the safety assessment",
     "A requirement copied unchanged from a standard into the project",
     "A test case written from the code to reach a coverage target",
     "A requirement the customer has withdrawn but not yet deleted"
   ],
   "Derived requirements (for example the choice of a filter rate or a design detail) can affect safety, so they are reported to the system process. Such items must not remain unknown to the safety assessment."],
  ["Why is bi-directional traceability between requirements, code and tests required?",
   null,
   [
     "It shows each requirement is implemented and tested, and exposes extra code or tests",
     "It reduces the number of lines of code that must be reviewed",
     "It lets the compiler optimise the traced functions more safely",
     "It removes the need for reviews of the design data"
   ],
   "Forward traceability shows coverage of requirements. Backward traceability shows no unneeded code or tests. Both directions support impact analysis for changes."],
  ["Which statement about verification independence is correct for DO-178C?",
   null,
   [
     "For higher levels, someone other than the developer must verify some items",
     "Independence is never required, because reviews are always peer reviews",
     "Independence always means the verifier works for a separate company",
     "Independence applies to testing only and never to reviews"
   ],
   "Independence is defined as the verifier not being the author of the item verified (tools can help achieve it). The applicable objectives are marked in Annex A, which should be checked for the level concerned."],
  ["What is the purpose of software quality assurance (SQA) in DO-178C?",
   null,
   [
     "To give confidence that plans are followed, independently of development",
     "To write the code and the low-level requirements for the project",
     "To design the target hardware and its interfaces",
     "To replace testing with audits of the process records"
   ],
   "SQA audits process conformance, reviews data and takes part in the transition criteria checks. It has authority to report issues and is independent of the development organisation."],
  ["What does configuration management control in DO-178C?",
   null,
   [
     "Identification, baselines, change control and problem reporting",
     "Only the compiler options that are used in the build",
     "Only the target hardware and its part numbers",
     "Only the contract between the customer and the supplier"
   ],
   "It covers all life cycle data. Control categories determine how rigorously an item is controlled (for example changes to some items need formal change control and problem reporting). Check the control categories in the standard."],
  ["A problem report is raised after the software baseline was released. Which activity is needed?",
   null,
   [
     "Assess it, change under control, analyse impact and repeat the affected verification",
     "Fix it in the field and record the change at the next release",
     "Close it as soon as the customer stops reporting it",
     "Wait until the next project, then fix it with the other changes"
   ],
   "Problem reporting links to change control and re-verification. Open problem reports at delivery are listed in the SAS with their assessment."],
  ["Which review checks that low-level requirements are consistent with the high-level requirements and the architecture?",
   null,
   [
     "A review of low-level requirements and architecture for consistency and traceability",
     "A compiler run that reports warnings on the source files",
     "A hardware self-test of the target at power-up",
     "A count of the lines of code in each module"
   ],
   "DO-178C lists reviews of each development data item with these criteria (compliance with the higher level, accuracy, consistency, verifiability, conformance to standards, traceability, algorithm accuracy and compatibility with the target)."],
  ["What does 'compatibility with the target computer' mean in a requirements review?",
   null,
   [
     "The design can be met within the hardware's timing, memory and I/O",
     "The developer is allowed to use the computer for the project",
     "The source code compiles on any computer in the project",
     "The display of the computer is large enough to show the requirements"
   ],
   "Checks include memory, throughput, interrupt and I/O behaviour and the use of hardware features, which links to the stack, WCET and resource-usage analyses."],
  ["What is the purpose of robustness test cases in DO-178C requirements-based testing?",
   null,
   [
     "To show correct response to abnormal inputs that the requirements specify",
     "To test only normal behaviour across the nominal range",
     "To measure how long the compile and link steps take",
     "To check the code against the coding style rules"
   ],
   "Normal-range and robustness cases both derive from the requirements. Robustness requirements must exist (for example the response to invalid data) so that the test has an expected result."],
  ["What is the relationship between requirements-based testing and structural coverage?",
   null,
   [
     "Tests come from requirements; coverage analysis then exposes gaps",
     "Structural coverage replaces requirements-based testing at Level A",
     "Coverage can be measured without running any tests",
     "The two activities are unrelated, so their evidence is kept apart"
   ],
   "Structural coverage is a check on the completeness of requirements-based testing, not a test design method. Tests added only to reach coverage with no requirement behind them do not fulfil the objective."],
  ["What is 'data coupling analysis'?",
   null,
   [
     "An analysis that one component's use of another's data is correct",
     "A count of the data bytes shown in the memory map",
     "A measurement of the CPU clock rate on the target",
     "A check of the network cable between two units"
   ],
   "Data and control coupling analyses check that components interact only as designed and that the test cases exercise those interactions. They address interface errors between separately verified components."],
  ["What is 'control coupling' in the context of DO-178C analysis?",
   null,
   [
     "How one component influences another's execution, and that tests exercised it",
     "The coupling capacitor between two parts of the hardware",
     "A type of loop in the code that calls itself",
     "A scheduler setting that links two tasks together"
   ],
   "Analysis covers the set of calls and execution paths between components and checks that the requirements-based tests exercised them. The analysis approach is agreed in the plans."],
  ["Why is it a problem if a test passes yet the corresponding requirement is not traced to the test?",
   null,
   [
     "The evidence does not show which requirement the test covers",
     "It is not a problem, since a passing test is enough evidence",
     "The test then runs more slowly than the other tests",
     "The compiler warns about it during the build"
   ],
   "Traceability from tests to requirements is a verification objective. Without it, coverage of requirements cannot be claimed and the test's purpose is unclear."],
  ["Which of the following is a valid reason to update the PSAC during a project?",
   null,
   [
     "A change in level, tools, architecture or means of compliance",
     "The team moves to a new office building",
     "A new engineer joins the verification team",
     "The project changes its weekly meeting schedule"
   ],
   "Plans are living documents when the approach changes, and the authority must agree to significant changes. Changes should be controlled and recorded."],
  ["What is the purpose of the stages of involvement (SOI) reviews that some authorities use?",
   null,
   [
     "Checkpoints where the authority checks progress and evidence",
     "Reviews of the marketing material for the equipment",
     "Reviews of the building and its access control",
     "Reviews of the staff salaries and contracts"
   ],
   "Staged reviews let the authority check that the process is followed and evidence is produced as planned. The scheme and names differ between authorities, so confirm them in the project's certification plan."]
]);
window.QUIZ_ADD("do178c", [
  ["Which DO-178C companion document addresses tool qualification?",
   null,
   [
     "DO-330, Software Tool Qualification Considerations",
     "DO-254, for complex electronic hardware",
     "ARP4761, for safety assessment methods",
     "DO-297, for integrated modular avionics"
   ],
   "DO-330 is the tool qualification document. DO-254 concerns complex electronic hardware, ARP4761 safety assessment methods, and DO-297 integrated modular avionics guidance. Verify the current revisions."],
  ["Which supplement addresses model-based development and verification?",
   null,
   [
     "DO-331",
     "DO-332",
     "DO-333",
     "DO-330"
   ],
   "DO-331 covers model-based development, DO-332 object-oriented technology and related techniques, DO-333 formal methods, and DO-330 tool qualification. A project that uses a supplement must say so in the PSAC. Verify the identifiers against the current documents."],
  ["What can formal methods (per the formal-methods supplement) potentially replace or reduce?",
   null,
   [
     "Some review and test activities, if the analysis is sound and agreed",
     "All requirements work, because formal proofs need no requirements",
     "Configuration management, because proofs are not versioned",
     "Quality assurance, because proofs are checked by tools"
   ],
   "Formal analysis can give evidence for verification objectives, such as showing that code complies with requirements for all inputs. Its soundness and the tool's qualification are part of the argument."],
  ["What is 'dead code' in DO-178C terms, and what is the usual handling?",
   null,
   [
     "Code that cannot execute or has no requirement; remove it or justify it",
     "Code with very long comments that nobody reads",
     "Code that is used only inside the test environment",
     "Code that is stored in the bootloader area of flash"
   ],
   "Dead code is a defect in design or implementation. Where it cannot be removed, the analysis must show it is harmless. Do not confuse it with deactivated code, which is intentionally present but not used in a configuration."],
  ["What is 'deactivated code'?",
   null,
   [
     "Code present but not meant to run in a configuration",
     "Code deleted from the repository after the last baseline",
     "Code that fails its tests and is excluded from the build",
     "Code that has been left behind in comments"
   ],
   "Deactivated code must be controlled so it cannot be activated unintentionally, and the activation conditions are verified where the code is used in other configurations."],
  ["What is 'parameter data item' (PDI) verification about?",
   null,
   [
     "Verifying data that changes behaviour without changing the executable",
     "Verifying the compiler that builds the executable",
     "Counting the parameters of each function in the code",
     "Verifying the pin count of the target hardware"
   ],
   "A parameter data item file can change behaviour, so its content and its integration with the executable must be verified. Changes to it are controlled like changes to software."],
  ["A project reuses software from an earlier product (previously developed software). What is a typical requirement?",
   null,
   [
     "A gap analysis against the objectives, agreed in the PSAC",
     "Nothing is needed, because the earlier project was certified",
     "A rewrite of everything without any analysis",
     "A change of the version number in the file header"
   ],
   "Reuse depends on how the earlier evidence matches the objectives and the new context (hardware, level, environment). Service history can support the argument but requires authority agreement."],
  ["What is 'service history' used for in certification credit for software?",
   null,
   [
     "Supplementary evidence from operation, if the authority accepts it",
     "A guarantee that no testing is needed for the software",
     "A marketing document that describes customer satisfaction",
     "A substitute for the software requirements"
   ],
   "Claiming credit needs relevant, well-documented, problem-reported data from similar use. It is a negotiated area, so agree it early."],
  ["In a multicore project, which activity does DO-178C-related guidance (for example CAST-32A / AMC 20-193) put emphasis on?",
   null,
   [
     "Mitigating interference on shared resources and verifying timing",
     "Raising the clock rate to hide the timing problems",
     "Ignoring shared resources, since each core runs alone",
     "Removing the requirements that depend on timing"
   ],
   "Shared caches, memory controllers and buses make execution times depend on other cores. The guidance asks for planning, interference analysis, verification and resource-usage evidence. Check which document applies to your authority and its current revision."],
  ["What does 'robust partitioning' mean?",
   null,
   [
     "Components in different partitions cannot affect each other",
     "Components share memory freely so that they can cooperate",
     "One single large component runs all of the functions",
     "A partition that is covered by additional tests only"
   ],
   "The claim is that a partition's faults cannot propagate. It is the basis for assigning different software levels to partitions, and needs supporting evidence for the platform or kernel."],
  ["Why must structural coverage analysis be performed on the final, delivered configuration (or an equivalent shown by analysis)?",
   null,
   [
     "Optimisation, conditional compilation and instrumentation change the structure",
     "Coverage never depends on the build that was used",
     "Only the source code matters, so builds are irrelevant",
     "The debugger requires the final build for its work"
   ],
   "Coverage evidence must apply to the code that flies. If instrumented builds differ from the product, an argument for equivalence is needed, including the effect of instrumentation on timing and behaviour."],
  ["A coverage tool instruments the source to record decisions. What is a concern for certification?",
   null,
   [
     "Instrumentation can change timing, size and behaviour",
     "Nothing, because instrumentation is always harmless",
     "The tool improves the performance of the code under test",
     "It removes the need for requirements-based tests"
   ],
   "The tool is a verification tool whose output could fail to detect errors (a coverage gap). Evaluate its criteria for qualification and the equivalence of the instrumented and delivered code."],
  ["At Level A, for what reason might object code coverage analysis be needed in addition to source coverage?",
   null,
   [
     "When object code is not directly traceable to the source",
     "Never, because source coverage is always enough",
     "Because object code is easier for reviewers to read",
     "Because the tool licence requires object-level analysis"
   ],
   "DO-178C asks for extra verification at Level A if the object code is not directly traceable to source statements. Projects often compile with limited optimisation or analyse the object code for those constructs."],
  ["What is 'requirements coverage' as distinct from 'structural coverage'?",
   null,
   [
     "Requirements coverage shows each requirement tested; structural shows code run",
     "They are the same measure under two different names",
     "Requirements coverage measures the lines of code executed",
     "Structural coverage measures the requirements tested"
   ],
   "Both are needed. Complete structural coverage does not prove all requirements were verified, and complete requirements coverage does not prove the code contains nothing else."],
  ["Which statement describes MC/DC independence of a condition?",
   null,
   [
     "Changing only that condition, with others fixed or masked, flips the outcome",
     "Changing the condition leaves the outcome unchanged",
     "Changing all conditions at once changes the outcome",
     "The condition is evaluated twice in the same test"
   ],
   "The independence pair demonstrates that the condition affects the outcome. See the Coverage & MC/DC module for how to find pairs and minimal sets."],
  ["Why can statement coverage of 100 % still leave an important defect untested?",
   null,
   [
     "A branch with no else path may run in one direction only",
     "Statement coverage already covers every branch outcome",
     "Statement coverage does not count the lines of code",
     "Statement coverage measures only the compiler"
   ],
   "Statement coverage does not require both outcomes of decisions. That is why Level A and B require stronger criteria. Defects in the untested outcome, such as a missing action, remain hidden."],
  ["What is the purpose of 'software life cycle environment' controls in DO-178C?",
   null,
   [
     "To control compiler, linker and test setup so builds can be reproduced",
     "To keep the working area tidy for the audit",
     "To choose the office layout for the project",
     "To set the salaries of the project staff"
   ],
   "A reproducible environment is evidence. The environment configuration is recorded (for example in an environment configuration index) and controlled."],
  ["How should compiler optimisation settings be treated in a DO-178C project?",
   null,
   [
     "As controlled configuration data, justified and used consistently",
     "As settings that may be changed freely before delivery",
     "As details that the authority never needs to see",
     "As settings that differ per file without any record"
   ],
   "Different options change the object code, timing and coverage. Fix the options early, record them, and use the same ones in the verified build."],
  ["When is a software change considered 'minor' enough that re-verification may be reduced?",
   null,
   [
     "Only after impact analysis shows which items are affected",
     "When the edit is a single line of code",
     "When it only touches a comment, with no analysis",
     "Never, because every change repeats all verification"
   ],
   "A one-line change can affect timing, data flow or interfaces, so impact analysis is required. Regression selection must be justified, and the baseline updated."],
  ["What is the typical content of a Software Verification Plan (SVP)?",
   null,
   [
     "The verification organisation, methods, independence and environment",
     "The source code and the build scripts of the software",
     "The test results and the coverage figures",
     "The project schedule and the marketing plan"
   ],
   "The SVP defines how verification will be done and recorded. Procedures and cases then implement it, and results record the evidence."],
  ["Which of these is an appropriate way to treat an anomaly found in tool output used for verification?",
   null,
   [
     "Record a problem report, assess earlier results, correct under control",
     "Ignore it if the tool still passes most of the tests",
     "Delete the earlier results that used the tool",
     "Rename the tool and carry on as before"
   ],
   "A tool error can invalidate earlier evidence, so assess which results used the affected function. Re-run if needed and keep the record."]
]);
window.QUIZ_ADD("do178c", [
  ["Which document describes the system-level development assurance process that feeds the software level and requirements?",
   null,
   [
     "SAE ARP4754A on system development (verify the revision)",
     "MISRA C, the coding guidelines for the C language",
     "IEEE 754, the floating-point arithmetic standard",
     "ISO 8601, the date and time notation standard"
   ],
   "ARP4754A covers system development, including allocation of requirements and development assurance levels to hardware and software. ARP4761 provides the safety assessment methods. Verify the current revisions."],
  ["What does a Functional Hazard Assessment (FHA) produce?",
   null,
   [
     "A list of failure conditions with severity, driving the assurance levels",
     "A list of the source files in the baseline",
     "A test report from the equipment qualification",
     "A bill of materials for the target hardware"
   ],
   "The FHA is an early safety assessment activity that identifies failure conditions and classifies their effects. Later analyses (preliminary system safety assessment, system safety assessment) check the architecture and the design against these."],
  ["How can system architecture reduce the software level needed for a component?",
   null,
   [
     "By independent mitigation, such as a monitor, agreed by the authority",
     "By renaming the component with a lower level",
     "By removing the requirements that carry the risk",
     "By writing less code in the component"
   ],
   "Level allocation follows failure-condition mitigation arguments with independence between the items. The argument is a system-level one, not a software decision, and needs authority agreement."],
  ["A function with a catastrophic failure condition is implemented by two identical software copies on two cores running the same code. Which is the main limitation of this as a mitigation?",
   null,
   [
     "A systematic fault is common to both copies of the software",
     "Two copies always double the safety of the function",
     "Identical copies remove all random hardware faults",
     "Identical copies need no requirements of their own"
   ],
   "Replication protects against random hardware faults, not common-mode software defects. Dissimilar software or an independent monitor addresses systematic errors, at a cost, and must still be justified."],
  ["What is the difference between a random hardware fault and a systematic software fault, for assurance purposes?",
   null,
   [
     "Random faults have failure rates; systematic ones are controlled by process",
     "Software faults are random and have known rates",
     "Hardware faults are always systematic",
     "Both kinds are handled in the same way"
   ],
   "DO-178C assigns confidence in the absence of systematic errors through process objectives. It does not use a numerical failure rate for software, which is why a level is a rigour level, not a probability."],
  ["Which statement about software 'levels' and failure probability is correct?",
   null,
   [
     "The level sets the rigour of the objectives, not a failure rate",
     "Level A means a failure rate of exactly 10^-9 per hour",
     "Level D means up to 100 failures per hour",
     "Levels apply only to hardware and never to software"
   ],
   "Assessing software failure by probability is not considered practical, so the process is the means of assurance. Numerical probabilities apply at system level, based on the failure condition severity."],
  ["What is a typical reason to run structural coverage analysis on the target hardware rather than only on a host simulator?",
   null,
   [
     "To show the delivered object code behaves as tested on the target",
     "Simulators cannot run requirements-based tests, so a target is always needed",
     "Host builds use the same compiler, so only the target adds memory limits",
     "Target coverage is cheaper than host coverage, so it is preferred"
   ],
   "Differences between host and target (compiler, library, word size, interrupts, timing) can change behaviour. If host tests are used, the equivalence needs justification, and some objectives require target testing."],
  ["What is 'hardware/software integration testing'?",
   null,
   [
     "Testing the software on the target with its interfaces and timing",
     "Testing only the source code on a development PC",
     "Testing the compiler against the language standard",
     "Testing the wording of the requirements document for clarity"
   ],
   "These tests expose problems such as incorrect hardware assumptions and interface timing errors, and check the use of the target's resources. They are usually derived from the software and system requirements."],
  ["Why are stack usage and memory margin analyses part of certification evidence?",
   null,
   [
     "Overflow causes unpredictable behaviour, so the maximum use must be shown",
     "Stack and memory use do not matter once the tests pass",
     "They are required only for software with a graphical interface",
     "They are needed only to size the product for marketing"
   ],
   "These resource analyses support the objective that the software is compatible with the target. Methods include static analysis and stress tests with high-water marks."],
  ["What is the typical purpose of a coding standard in a DO-178C project?",
   null,
   [
     "To restrict the language to analysable, reviewable constructs",
     "To make the code longer and more readable for new staff",
     "To keep all of the code together in one source file",
     "To raise the compile time so that errors show up sooner"
   ],
   "The coding standard is a plan item. Compliance is checked as part of source code verification and its deviations are recorded and justified."],
  ["Which approach to compiler warnings and static analysis results is typical for Level A software?",
   null,
   [
     "Eliminate them, or justify each remaining one in a reviewed record",
     "Ignore all warnings once the code behaves correctly in tests",
     "Turn warnings off in the final build to match the flight build",
     "Delete the analysis logs after the first review is complete"
   ],
   "Findings are evidence. A dispositioned list shows that each message was considered, and that tools support the review objectives, subject to tool qualification if they replace a review."],
  ["Why should source code reviews check for 'unintended function' beyond the requirements?",
   null,
   [
     "Extra code can create a hazard or hide a defect",
     "Shorter code is always safer, whatever it does",
     "Comments in the code must be removed before review",
     "Fewer variables always make each function safer"
   ],
   "Traceability backward from code to requirements shows unrequested behaviour. Such code needs a requirement (possibly derived) or removal."],
  ["What does 'transition criteria' mean in the software life cycle?",
   null,
   [
     "Conditions that must be met before moving to the next stage",
     "The number of working hours that are allowed per day",
     "The cost limits that apply to the project tools",
     "The type of connector that is used on the equipment"
   ],
   "Transition criteria make process entry and exit conditions explicit, for example requirements reviewed and baselined before design starts. SQA checks compliance with them."],
  ["A requirement says 'The software shall limit the output to a range of 0 to 100'. Which test cases are necessary?",
   null,
   [
     "Inside the range, at the boundaries, just outside, and invalid values",
     "One mid-range value such as 50 is enough to show compliance",
     "Only the lower boundary value 0, since it is the hardest",
     "Only negative values, because they are the abnormal cases"
   ],
   "Requirements-based tests use equivalence classes and boundary values, with robustness cases for out-of-range inputs. The expected results come from the requirement."],
  ["What is the key risk of testing that is based on the code (white-box) instead of the requirements?",
   null,
   [
     "Tests show only what the code does, so requirement gaps go undetected",
     "Such tests run too fast to be useful on the target",
     "Such tests use too little memory on the target",
     "Such tests always find every error in the code"
   ],
   "DO-178C requires tests to be derived from requirements. Structural analysis then checks completeness. Tests that come only from the code confirm the code, including its mistakes."],
  ["What is the purpose of reviewing test cases, procedures and results?",
   null,
   [
     "To show the tests are correct and complete for the requirements",
     "To save time in the verification phase of the project",
     "To write more code for the test harness",
     "To avoid configuration management of the test data"
   ],
   "A faulty test can hide a defect. Reviews of the verification data check that the tests are valid, traceable, and that the results meet expected outcomes with failures dispositioned."],
  ["What does a 'compliance matrix' (or similar mapping) typically show in a certification submission?",
   null,
   [
     "How each objective is met, with references to the evidence",
     "The names of the staff who worked on each objective",
     "The price of the software and its licence terms",
     "The compile commands that were used for each file"
   ],
   "A mapping from objectives to evidence helps both the applicant and the authority check completeness. The data items listed in the SAS support it."],
  ["Which type of change requires going back to the authority according to the agreed plans?",
   null,
   [
     "A significant change to an agreed item, such as level or architecture",
     "Any change to a variable name in the source code",
     "Any edit to a comment in the source code",
     "A change to the colour scheme of the display"
   ],
   "The PSAC is an agreement. Changes that alter what was agreed need renewed agreement, while internal edits under change control normally do not."],
  ["What is 'field-loadable software' and why is it a certification concern?",
   null,
   [
     "Software loadable in service, so its identity and integrity are controlled",
     "Software that is printed on paper for the review board",
     "Software that can only be run in the laboratory",
     "Software that is delivered without a part number"
   ],
   "Part numbering, integrity checks (CRC or signature), and compatibility checks protect against incorrect configuration. Field loading is also covered by guidance on loading processes, which should be checked for the application."],
  ["Why are the software part number and version required to change when the software baseline changes?",
   null,
   [
     "So the delivered configuration is uniquely identified and traceable",
     "For marketing reasons, so that new releases are visible",
     "To increase the size of the executable file",
     "Because the compiler requires a new version string"
   ],
   "Unique identification supports configuration control, problem reporting and investigation. The SCI ties the identifier to the exact items."],
  ["Which statement about security and DO-178C is most accurate?",
   null,
   [
     "DO-178C covers safety; security has separate guidance such as DO-326A",
     "DO-178C fully covers cybersecurity as well as safety",
     "Security has no relation to airborne software",
     "Security is covered only by MISRA C rules"
   ],
   "Security risk assessment can create requirements for the software, which then follow the DO-178C process. Check which security guidance your authority expects."]
]);
window.QUIZ_ADD("do178c", [
  ["Which objective applies to software at Level C in terms of structural coverage?",
   null,
   [
     "Statement coverage, with no decision or MC/DC requirement",
     "MC/DC, the same criterion as at Level A",
     "Decision coverage only, the same criterion as at Level B",
     "No structural coverage at all, as at Level D"
   ],
   "Level C needs statement coverage, Level B adds decision coverage, and Level A adds MC/DC. Level D has no structural coverage objective, and Level E has no DO-178C objectives."],
  ["A tool is used to automatically compare test results with expected values. A defect in the tool could cause a failing test to be reported as passing, and the tool's results replace manual checking. What is the qualification consideration?",
   null,
   [
     "It could miss errors and replaces other verification, so it needs qualification",
     "No qualification can ever apply to a verification tool",
     "Only compilers ever need tool qualification",
     "It must be qualified as a development tool, since its output is in the software"
   ],
   "Verification tools that could fail to detect errors and replace other verification need qualification. Which rigour (tool qualification level) applies follows DO-330 and the software level, so check the standard rather than guess."],
  ["Which statement about test environment differences from the target is most accurate?",
   null,
   [
     "They must be identified and justified, showing results apply to the target",
     "Differences are irrelevant to the verification results",
     "All tests must run on the target in every case",
     "Differences concern only the size of the test screen"
   ],
   "Simulators and emulators are acceptable if their fidelity is justified. The environment is part of the verification plan, and some objectives need target-based tests."],
  ["What is the purpose of the 'Software Requirements Data' review in DO-178C?",
   null,
   [
     "To check requirements are accurate, verifiable, consistent and traceable",
     "To check the coding style of the source code",
     "To count the requirements in the document",
     "To check the licence of the tools used"
   ],
   "Poor requirements are the most common root cause of later problems. Reviews should involve system, software and test engineers, and include safety viewpoints."],
  ["Why is testability of requirements important?",
   null,
   [
     "An unverifiable requirement cannot show compliance",
     "Testable requirements shorten the requirements document",
     "Testability is only a matter of style",
     "Testable requirements make the code run faster"
   ],
   "Words such as 'fast' or 'adequate' lack acceptance criteria. Each requirement needs a verification method and expected result."],
  ["What does 'accuracy and consistency' of source code against low-level requirements imply during review?",
   null,
   [
     "The code implements exactly what is specified, including types and ranges",
     "The code is as short as possible",
     "The code uses only global variables",
     "The code has many comments"
   ],
   "Code review compares the implementation with the low-level requirement and the architecture, checking details such as rounding, units and boundary handling."],
  ["Which fault is MOST likely to be found by decision coverage but missed by statement coverage?",
   null,
   [
     "A missing else action that statement coverage never forces",
     "A syntax error somewhere in the source file",
     "A missing semicolon at the end of a line",
     "A wrong function name inside a comment"
   ],
   "A one-sided `if` can reach 100 % statement coverage by exercising only the true case. Decision coverage requires the false outcome as well, which exposes the missing handling."],
  ["Which is a reason why MC/DC is required at Level A even though it needs more tests than decision coverage?",
   null,
   [
     "It shows each condition affects the decision, catching operator errors",
     "It is faster to run than decision coverage",
     "It removes the need for requirements-based tests",
     "It exercises the target hardware as well"
   ],
   "Decision coverage can be met without showing that each condition matters. MC/DC needs about N + 1 tests for N conditions in the simple cases, so it scales far better than testing all combinations."],
  ["What is the main idea of 'masking' MC/DC compared with unique-cause MC/DC?",
   null,
   [
     "Other conditions may change in the pair if logic masks their effect",
     "No conditions are tested at all",
     "Only one test is needed for each decision",
     "It applies only to loop conditions"
   ],
   "Unique-cause changes only one condition between the pair. Masking allows others to change if they cannot affect the result. See the MC/DC module and verify the accepted interpretation with the authority."],
  ["Which of the following best describes the relationship between DO-178C and DO-254?",
   null,
   [
     "DO-178C is for airborne software and DO-254 for complex hardware",
     "They are the same document, published under two numbers",
     "DO-254 is for compilers and DO-178C is for hardware",
     "DO-178C is only for hardware, and DO-254 for software"
   ],
   "Projects with programmable logic follow DO-254 for the hardware design, and DO-178C for the software running on it. The system process allocates the requirements and levels."],
  ["What is IMA (integrated modular avionics) and which guidance addresses it?",
   null,
   [
     "Functions share computing resources in partitions, guided by DO-297",
     "A radio frequency band that is reserved for avionics",
     "A text editor that is used to write requirements",
     "A compiler flag that is used for avionics code"
   ],
   "IMA supports incremental acceptance of platform and applications, with the module's robust partitioning being the key feature. DO-297 describes roles and tasks for these systems."],
  ["Why should the software architecture document its use of interrupts and shared data?",
   null,
   [
     "They affect timing, coupling and partitioning, so they need analysis",
     "Interrupts are not part of the software design",
     "Interrupts are free of any timing cost",
     "Shared data is always safe in interrupt handlers"
   ],
   "Architecture data supports the data and control coupling analysis, the WCET analysis and the review of concurrency hazards."],
  ["What is the safest way to deal with an unused (not required) function found in a library linked into Level A software?",
   null,
   [
     "Remove it, or show it is deactivated and cannot execute",
     "Leave it, because libraries are exempt from coverage",
     "Mark it with a comment and move on",
     "Test it with random inputs until it is covered"
   ],
   "Unreachable library code is either excluded or justified by analysis. Library functions that are used also need evidence that they behave as required."],
  ["Which statement about the C standard library in Level A software is most accurate?",
   null,
   [
     "Functions used are part of the software and need verification evidence",
     "The library is exempt from verification",
     "All library functions are certified automatically",
     "Only `printf` must be verified"
   ],
   "Library code is object code in the delivered software. The project must either verify it or obtain credible evidence, and many projects write small, tested replacements."],
  ["Why do certification projects often define a language subset for C (for example derived from MISRA C)?",
   null,
   [
     "To avoid undefined behaviour and make code analysable",
     "To make the code run slower and so more safely",
     "To avoid writing documentation for the code",
     "To reduce the number of requirements"
   ],
   "A subset reduces the risk from language pitfalls and supports static analysis. DO-178C does not mandate one, but requires the standards chosen in the plans to be followed."],
  ["What is meant by 'initialisation and reset behaviour' requirements?",
   null,
   [
     "They define output and data state after power-up and reset",
     "The colour of the start-up screen of the display",
     "The size of the boot logo shown at power-up",
     "The manufacturing date shown at start-up"
   ],
   "Start-up is a high-risk phase. Requirements should define safe output states, built-in tests, and what happens on a repeated reset."],
  ["What is a built-in test (BIT) used for in airborne equipment?",
   null,
   [
     "To detect faults at start-up or in operation, with verified claims",
     "To test the compiler at build time",
     "To print documents on the equipment",
     "To measure the fuel in the tanks"
   ],
   "BIT contributes to safety by detecting latent faults. Its detection coverage and false-alarm behaviour are specified, and those claims are verified (for example by fault injection)."],
  ["Why can software fault-injection tests be valuable for demonstrating robustness?",
   null,
   [
     "They force rare error conditions to show fault handling works",
     "They slow down the test run and nothing more",
     "They replace the software requirements",
     "They remove the need for coverage analysis"
   ],
   "Error-handling code is often uncovered by normal tests. Injected faults (corrupted data, failed calls, timeouts) exercise it, which supports both robustness verification and structural coverage."],
  ["A requirement is changed late. What is the minimum a project must do?",
   null,
   [
     "Update affected data under control and repeat the affected verification",
     "Update only the text of the requirement",
     "Update only the code and leave the rest",
     "Restart the project from the planning phase"
   ],
   "Traceability data makes the impact analysis possible. All items linked to the requirement need review, and the evidence set must again be consistent."],
  ["Which of these artifacts would an authority expect to see as evidence of structural coverage analysis?",
   null,
   [
     "Coverage reports tied to the verified build, with each gap resolved",
     "A screenshot of the IDE showing the coverage bar",
     "A statement of the programmer's confidence in the tests",
     "The licence of the coverage tool"
   ],
   "Percentages alone are not enough: each gap needs a disposition. The configuration of the build, tests and tools used must be recorded so the result can be reproduced."],
  ["What is an 'open problem report' at the time of software delivery, and how is it handled?",
   null,
   [
     "A known unresolved problem, assessed and listed in the SAS",
     "A report that was deleted before delivery",
     "A marketing note about product defects",
     "A note that reviewers may ignore"
   ],
   "Unresolved issues should be understood, justified and visible. A hidden open problem in a certified baseline is a serious process failure."],
  ["Which of the following is part of the 'certification liaison process'?",
   null,
   [
     "Agreement with the authority on plans, evidence and deviations",
     "Writing assembly code for the target",
     "Buying the target hardware for the project",
     "Selecting the colour scheme of the display"
   ],
   "Liaison covers the early agreement on the PSAC, the staged reviews, and the resolution of issues until the compliance finding. It continues through changes after certification."],
  ["A project plans to certify new software and says that the tests 'will be written after the code is complete and will aim for 100 % MC/DC'. What is the main weakness of this plan?",
   null,
   [
     "Tests should derive from requirements; coverage-first only confirms the code",
     "MC/DC is too easy to reach without requirements",
     "Code should never be written before tests",
     "A figure of 100 % is impossible to measure"
   ],
   "Coverage measures the thoroughness of requirements-based tests. Writing tests to reach coverage reveals gaps but cannot show that the code implements the requirements."]
]);
window.QUIZ_ADD("do178c", [
  ["A reviewer finds that a requirement has no corresponding test but the code for it achieves 100 % MC/DC from other tests. Is the verification complete?",
   null,
   [
     "No: its requirements-based testing is missing despite the coverage",
     "Yes, because coverage is 100 %",
     "Yes, because MC/DC replaces requirements tests",
     "Yes, if the code compiles"
   ],
   "Structural coverage and requirements coverage are separate objectives. Code can be executed by tests for other requirements without showing that this requirement's behaviour is correct."],
  ["What should be done when a requirements-based test fails and the cause is a defect in the test procedure, not in the software?",
   null,
   [
     "Record it, correct the procedure under control, review and repeat",
     "Delete the failed result and run the next test",
     "Change the expected result to match the output",
     "Ignore it, since the software passed on retry"
   ],
   "Failures, even in tests, are part of the evidence trail. Changing expected results to fit the output without analysis would destroy the independence of the test from the code."]
]);
