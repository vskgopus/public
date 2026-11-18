/* Embedded C: extra questions (c13 onward). Format and rules: see the header of questions.js. APPEND ONLY. */
window.QUIZ_ADD("c", [
  ["A memory-mapped status register is read in a polling loop. Which declaration is correct for a read-only hardware register?",
   "#define STATUS (*(/* ??? */ uint32_t *)0x40001000U)\nwhile ((STATUS & 1U) == 0U) { }",
   [
     "`const volatile`: no writes, and every read reaches the hardware",
     "`const` only: the compiler may then keep the value in a register, which suits a read-only object",
     "`volatile` only: `volatile` also forbids writes, so the register becomes read-only",
     "`static`: it limits the access to once per function call"
   ],
   "`volatile` forces a real read on each access, and `const` makes the compiler reject writes in the program. Without `volatile` the loop may be reduced to a single read, which gives an endless loop or none at all. `const` alone tells the compiler the value never changes. `volatile` does not make anything read-only, and `static` has no effect on access behaviour."],
  ["What is the effect of this cast on a typical Arm Cortex-M0 (no unaligned access support)?",
   "uint8_t buf[8];\nuint32_t v = *(uint32_t *)&buf[1];",
   [
     "It can fault or misread, and is undefined behaviour in C",
     "It is always safe, because any pointer type can be converted to any other and dereferenced",
     "It works but is slower, because the compiler inserts a helper that fixes the alignment",
     "It is well defined, because `uint8_t` may alias any object, including a `uint32_t`"
   ],
   "A `uint32_t` access at an odd address violates alignment. On cores without unaligned support that traps, and in C the conversion itself is undefined if the result is not suitably aligned. The portable fix is `memcpy(&v, &buf[1], sizeof v)` or building the value from bytes with shifts. Character types may alias other objects, but that does not remove the alignment rule."],
  ["Which statement about the strict aliasing rule is correct?",
   null,
   [
     "Reading through an unrelated type is undefined, except via character types",
     "It affects only `float` and `double` types and never integers",
     "It is only a compiler warning and never changes the generated code",
     "It applies only to builds at `-O0`, and is ignored when optimising"
   ],
   "Strict aliasing lets the optimiser assume that pointers to unrelated types do not refer to the same memory, so it can reorder or remove loads and stores. Type punning through a pointer cast can then give silently wrong code at higher optimisation levels. Use `memcpy` or a union (as defined by the standard and your compiler documentation) instead."],
  ["A struct is sent unchanged over a network link between two different MCUs. What is the most important problem?",
   "typedef struct {\n    uint8_t  id;\n    uint32_t value;\n    uint16_t flags;\n} Msg_t;",
   [
     "Padding, alignment and byte order can differ between the targets",
     "`uint8_t` cannot be used as a struct member on a network interface",
     "A struct is limited to 4 bytes when it is transmitted",
     "The C standard fixes the exact layout of every struct, so there is no problem"
   ],
   "The standard does not define padding or endianness. Define the wire format explicitly (byte offsets, endianness) and serialise field by field. `#pragma pack` or `__attribute__((packed))` is a compiler extension, can cause misaligned accesses, and does not fix byte order."],
  ["Why are bit-fields a poor choice for describing a hardware register layout or a wire format?",
   null,
   [
     "Their bit order and packing are implementation-defined, so layout is not portable",
     "Bit-fields cannot be members of a `struct`, only of a `union`",
     "Bit-fields always add 4 bytes of padding, which breaks register maps",
     "A bit-field can never hold more than one bit"
   ],
   "Allocation order inside a storage unit, whether a field can straddle a unit, and whether a plain `int` field is signed are all implementation-defined. For registers and protocols use masks and shifts with named constants. Many coding standards (for example MISRA C) restrict bit-field use for this reason."],
  ["What is the result on a 32-bit-int target?",
   "int32_t x = 1;\nint32_t y = x << 31;",
   [
     "Not safely defined: a 1 shifted into the sign bit is undefined",
     "Always 0x80000000, which is well defined because the shift is done on the bit pattern",
     "Always 0, because the bit is shifted out of the 32-bit value",
     "A compile-time error in every conforming compiler"
   ],
   "For signed types, a left shift whose result does not fit in the result type is undefined behaviour (C11 6.5.7). Shift an unsigned operand instead, for example `1U << 31`, and convert deliberately if a signed result is needed."],
  ["A right shift by 40 is applied to a `uint32_t`. What does the C standard say?",
   "uint32_t v = 0xFFFFFFFFU;\nuint32_t r = v >> 40;",
   [
     "Undefined behaviour: the count must be less than the operand width",
     "The result is 0, because all bits are shifted out of the value",
     "The result is 0xFFFFFFFF, because the shift count wraps modulo 32 on every target",
     "Implementation-defined, but guaranteed to be 0 or 0xFFFFFFFF"
   ],
   "Shifting by a count that is negative or not less than the width of the (promoted) left operand is undefined. Hardware behaviour differs (some CPUs mask the count), so tests on one target prove nothing. Check the count or mask it explicitly."],
  ["Which of these is an example of unspecified (not undefined) behaviour?",
   null,
   [
     "The order in which the arguments of a function call are evaluated",
     "Dereferencing a null pointer, for which the standard gives no requirement",
     "Signed integer overflow in an addition, which the standard leaves undefined",
     "Reading an object after its lifetime has ended"
   ],
   "Unspecified behaviour means the standard allows two or more outcomes and does not require the choice to be documented, as with argument evaluation order. The other three are undefined behaviour, where the standard puts no requirement on the result. Code must not depend on unspecified behaviour."],
  ["What does this statement do, and what is the problem?",
   "int i = 0;\nint a[3] = {0, 0, 0};\na[i] = i++;",
   [
     "Undefined: `i` is modified and read with no sequencing between them",
     "It always sets `a[0]` to 0, because the index is read before the increment",
     "It always sets `a[1]` to 0, because the increment happens first",
     "It is well defined, because assignment is evaluated from right to left"
   ],
   "C does not sequence the evaluation of the left index against the side effect of `i++` (before C11 this is a sequence-point violation; since C11 it is an unsequenced side effect and value computation). Split it into separate statements."],
  ["A macro is defined as follows. What is wrong with its use in `SQUARE(a + 1)` and `SQUARE(i++)`?",
   "#define SQUARE(x) x * x",
   [
     "Missing parentheses give `a + 1 * a + 1`, and `i++` runs twice",
     "Nothing, because function-like macros are type-checked just like functions",
     "The macro cannot take arguments, because `x` is a reserved name",
     "The `*` operator is not allowed inside macro bodies"
   ],
   "Macros are text substitution. Parenthesise every parameter and the whole expression, and avoid arguments with side effects. Prefer `static inline` functions, which have type checking and evaluate each argument once. MISRA C has directives and rules about function-like macros for these reasons."],
  ["A volatile flag is shared between `main` and an ISR on an 8-bit MCU. The flag is a `uint16_t` counter. What is the risk when `main` reads it?",
   "volatile uint16_t ticks;\nuint16_t t = ticks; /* main */",
   [
     "A 16-bit read takes two accesses, so `main` can read a torn value",
     "Nothing: `volatile` makes every access atomic on every target",
     "The compiler refuses to compile `volatile` objects wider than 8 bits",
     "The value is always read as zero, because the ISR owns the variable"
   ],
   "`volatile` controls whether the compiler performs the access, not whether the hardware access is atomic. Protect the read with a short critical section, a re-read-until-stable loop, or a double-buffer scheme. On 32-bit cores a naturally aligned 32-bit load is a single access, but check your architecture."],
  ["Which is the safest way to compare a computed `float` result with an expected value in a control unit?",
   null,
   [
     "Compare the absolute difference with a tolerance, and handle NaN",
     "Use `==`, because IEEE 754 guarantees exact results for every operation",
     "Cast both values to `int` first so the comparison is exact",
     "Use `!=` and invert the logic, because inequality is always exact"
   ],
   "Rounding error makes exact equality unreliable after arithmetic. Pick a tolerance that matches the accuracy needed (absolute or relative) and decide what a NaN input means, because every comparison with NaN except `!=` is false. MISRA C has a rule against direct float equality tests."],
  ["What is the likely failure in this ring buffer used by one producer ISR and one consumer task on a single core?",
   "uint8_t buf[64];\nuint8_t head, tail;   /* not volatile */\nvoid isr(void)   { buf[head] = rx(); head = (head + 1) % 64; }\nint  get(void)   { if (head == tail) return -1; int v = buf[tail]; tail = (tail + 1) % 64; return v; }",
   [
     "The compiler may keep `head` in a register, so new data is never seen",
     "`%` cannot be used with `uint8_t` operands, so the index wraps incorrectly",
     "The 64-byte buffer is too large to be indexed with an 8-bit variable",
     "One producer and one consumer never need `volatile`, even across an ISR"
   ],
   "Single-producer/single-consumer buffers can be lock-free only when each index is written by one side and the accesses are not cached or reordered. Without `volatile` (or atomics) the compiler can hoist the load of `head` out of a loop. On multicore, memory barriers are also needed (see the Embedded C module)."],
  ["What does `static` do when applied to a function-scope variable?",
   "void f(void) { static uint32_t calls = 0; calls++; }",
   [
     "It has static storage duration, so it keeps its value between calls",
     "It is placed on the stack and re-initialised on every call",
     "It becomes visible to other source files through external linkage",
     "It becomes `volatile`, so every access reaches memory"
   ],
   "Static storage duration means one object for the whole program, placed in `.data` or `.bss`. A static local has no external linkage. It is not re-entrant and is not thread-safe, which matters in RTOS tasks and ISRs."],
  ["On a typical bare-metal start-up sequence, what must the start-up code do before `main()` runs so that C initialisation rules hold?",
   null,
   [
     "Copy the initial `.data` values from flash to RAM and zero `.bss`",
     "Zero `.data` and copy `.bss` from flash to RAM",
     "Nothing, because the CPU initialises both sections in hardware",
     "Copy `.text` into RAM and clear it"
   ],
   "Initialised globals live in `.data` (initial values stored in flash, run-time copy in RAM), while uninitialised or zero-initialised ones live in `.bss`. A skipped copy or a corrupted linker symbol is a classic cause of 'wrong initial value' bugs. Safety systems also verify the copy."],
  ["A pointer is passed to two parameters and the function is declared with `restrict`. What is the programmer promising?",
   "void add(int *restrict d, const int *restrict s, size_t n);",
   [
     "Objects accessed through `d` are not accessed through `s` during the call",
     "That the function will be called from a separate thread only",
     "That neither pointer will ever be `NULL` during the call",
     "That the pointed-to data is stored in flash memory"
   ],
   "`restrict` is a promise to the compiler. If the caller passes overlapping memory the behaviour is undefined. It can enable vectorisation or reordering, but it is not checked, so it needs careful review in safety code."],
  ["Which function is the correct choice to copy a block when source and destination may overlap?",
   null,
   ["`memmove`",
    "`memcpy`",
    "`strcpy`",
    "`memcmp`"],
   "`memcpy` has undefined behaviour for overlapping regions. `memmove` handles overlap, normally at similar cost. `strcpy` is for NUL-terminated strings and is unsafe without a length check, and `memcmp` only compares."],
  ["What is the problem with `strncpy` as a 'safe' string copy?",
   "char dst[8];\nstrncpy(dst, src, sizeof dst);",
   [
     "If `src` fills the buffer, `dst` is not terminated",
     "It always overflows the destination buffer",
     "It cannot copy more than 4 characters per call",
     "It modifies the source string while copying"
   ],
   "`strncpy` does not guarantee termination when the source is as long as the limit, so code must terminate the buffer explicitly (`dst[sizeof dst - 1U] = '\\0'`). Many embedded standards ban the C string library in favour of length-checked helpers."],
  ["A `switch` over an `enum` has no `default` and the enum later gains a new value. Which practice best protects the code?",
   null,
   [
     "Add a `default` that reports an error or enters a safe state",
     "Leave it, because the compiler adds handling for new enumerators automatically",
     "Replace the `switch` with `if` statements using `==` only",
     "Cast the enum to `float` before the `switch`"
   ],
   "Without handling, a new enumerator silently does nothing or falls out of the switch. A defensive `default` (error handling, safe state, assertion) plus compiler warnings finds the omission. For MC/DC and decision coverage the `default` branch must then be reached by a requirement-based test or justified."],
  ["Why can `if (x = 5)` pass compilation yet be dangerous, and which practice reduces the risk?",
   null,
   [
     "It assigns 5 and tests it, which is always true",
     "It compares `x` with 5 as the author intended",
     "It does not compile in standard C",
     "It sets `x` to 5 only if `x` was previously zero"
   ],
   "Assignment is an expression in C, so it is legal inside a condition. MISRA C and most compilers flag it. Constant on the left (`5 == x`) is a style defence, but a warning-free build with static analysis is the more reliable control."],
  ["What does `sizeof` return for a function parameter declared as an array?",
   "size_t n(const int a[10]) { return sizeof a; }",
   [
     "The size of a pointer, because the parameter becomes `const int *`",
     "40, the size of ten `int` values with a 32-bit `int`",
     "10, the number of elements in the declaration",
     "Zero, because the array size is unknown inside the function"
   ],
   "An array parameter is adjusted to a pointer to its element type, so `sizeof a` is `sizeof(const int *)`. Pass the length as a separate parameter (or a struct) instead of computing it inside the function."]
]);
window.QUIZ_ADD("c", [
  ["What does this code print on a little-endian 32-bit target?",
   "uint32_t v = 0x11223344U;\nuint8_t *p = (uint8_t *)&v;\nprintf(\"%02X\", p[0]);",
   [
     "44, because the least significant byte is at the lowest address",
     "11, because the most significant byte is always stored first",
     "00, because `p` points past the end of the value",
     "Undefined, because a character pointer may not alias a `uint32_t`"
   ],
   "Little-endian stores the least significant byte first. Reading an object's bytes through `unsigned char` is allowed. Portable code should not depend on byte order: extract bytes with shifts (`(v >> 0) & 0xFFU`) when a defined layout is needed."],
  ["Why does C code that compares a signed and an unsigned operand often misbehave?",
   "int32_t a = -1;\nuint32_t b = 1U;\nif (a < b) { /* taken? */ }",
   [
     "The signed value converts to unsigned, so the condition is false",
     "The unsigned value converts to signed, so the condition is true",
     "The comparison is undefined behaviour in C",
     "The compiler always rejects comparisons between signed and unsigned operands"
   ],
   "With operands of the same rank, the usual arithmetic conversions convert the signed operand to unsigned. -1 becomes 4 294 967 295, which is larger than 1. MISRA essential type rules and `-Wsign-compare` catch this."],
  ["A function-like macro and a `static inline` function both compute the same expression. Why do safety-critical guidelines usually prefer the function?",
   null,
   [
     "A function is type-checked, evaluates each argument once and is analysable",
     "Functions are always faster than macros on every compiler",
     "Macros cannot be used inside `if` conditions",
     "Using a function removes the need for coverage analysis"
   ],
   "Macros bypass type checking and can evaluate arguments multiple times. A `static inline` function gives the compiler the same optimisation chance without those hazards. Coverage is still required on the function's code either way."],
  ["A project must not use dynamic memory after initialisation. Which technique satisfies this and still allows variable numbers of objects?",
   null,
   [
     "Static pools of fixed-size blocks, sized by worst-case analysis",
     "Calling `malloc` only from interrupt handlers",
     "Calling `realloc` whenever the number of objects changes",
     "Using variable-length arrays on the stack"
   ],
   "Fixed-block pools give deterministic allocation time and no external fragmentation, and the maximum count is a design constant that can be verified. `malloc` and `realloc` have variable time and can fragment, and VLAs have unbounded stack use and are banned by most standards."],
  ["What is the main reason `malloc` is avoided in long-running safety-critical firmware?",
   null,
   [
     "Variable execution time, possible failure and fragmentation over time",
     "It cannot allocate blocks larger than 64 bytes",
     "It always returns non-zeroed memory, which the standard forbids",
     "It is not part of the standard C library on embedded targets"
   ],
   "Heap allocators have variable timing and can fail, and fragmentation can make a request fail even when enough total memory exists. The failure appears late in operation and is hard to test. Many standards restrict or forbid dynamic allocation."],
  ["What does a stack-usage analysis need to be trustworthy for worst-case stack sizing?",
   null,
   [
     "A complete call graph including indirect calls and ISR nesting",
     "One run of the application with the stack filled with a pattern",
     "Only the size of the largest local array in the program",
     "The size of the `.data` section reported by the linker"
   ],
   "Static analysis of the final binary can bound the worst case if indirect calls, recursion (banned) and interrupt nesting are resolved. Measuring with a stack-fill pattern only shows the depth reached in the tests that were run, so it is useful as a cross-check, not as proof."],
  ["In a function-pointer dispatch table, what is a sound defensive practice?",
   "typedef void (*Handler_t)(void);\nstatic const Handler_t table[4] = { h0, h1, h2, h3 };\nvoid dispatch(uint8_t id) { table[id](); }",
   [
     "Range-check `id` and ensure no entry is `NULL` before calling",
     "Nothing, because array indexing is always safe in C",
     "Declare the table `volatile` so the index is checked at run time",
     "Cast `id` to `int8_t` so negative values are rejected"
   ],
   "An out-of-range index reads outside the table and calls whatever address is there. Validate the index (and treat the failure as a defined error), keep the table `const` in flash, and record the list of possible indirect targets for stack and coverage analysis."],
  ["Which declaration places a lookup table in read-only memory (flash) rather than RAM on a typical embedded toolchain?",
   null,
   [
     "`static const uint16_t table[] = {...};` at file scope, where the constant data can stay in flash",
     "`static uint16_t table[] = {...};` at file scope, which is always placed in flash",
     "`uint16_t table[] = {...};` inside a function, because automatic arrays live in flash",
     "`volatile uint16_t table[] = {...};` inside a function, which forces read-only placement"
   ],
   "A `const` object with static storage and constant initialisers is normally placed in `.rodata`, in flash. Without `const` the initial values are stored in flash and copied to RAM at start-up, which uses both. Check the map file, because placement is toolchain-specific."],
  ["What is the effect of `inline` on a function in C99/C11?",
   null,
   [
     "It is only a hint: the compiler may or may not inline the call",
     "It forces the compiler to inline every call, whatever the optimisation level",
     "It makes the function re-entrant, because no call frame is created",
     "It moves the function into RAM so it runs faster"
   ],
   "`inline` suggests inlining but the compiler decides. In C99/C11, an `inline` definition without `static` or an external definition elsewhere can produce link errors, so `static inline` in headers is the usual safe form. Real RAM placement needs a section attribute."],
  ["Why can code that works at `-O0` fail at `-O2` even though it compiles without warnings?",
   null,
   [
     "It may rely on undefined behaviour or a missing `volatile` that the optimiser exploits",
     "The optimiser at `-O2` is always buggy, so lower levels must be used",
     "At `-O2` the compiler switches the language rules to C++",
     "Optimisation removes macros and comments that the code needs"
   ],
   "Optimisers may assume undefined behaviour never occurs and may reorder, merge or remove accesses without `volatile`. Differences between optimisation levels are a standard way to expose such latent defects. The right fix is to remove the dependence, not to lower the optimisation level."],
  ["This empty loop is used as a short hardware delay. How should the delay be made reliable?",
   "for (i = 0; i < 1000; i++) { }",
   [
     "Use a hardware timer or cycle counter, since the loop can be removed",
     "Mark the counter `register` so the loop cannot be removed",
     "Increase the loop bound until the delay looks right on the bench",
     "Move the loop into a header so every file uses the same delay"
   ],
   "A loop with no side effects can be deleted by the optimiser, and even if kept its duration depends on optimisation, flash wait states and clock. A timer or cycle counter gives a measurable time base."],
  ["A 'magic number' comparison `if (state == 3)` appears in several files. What is the better practice for maintainability and verification?",
   null,
   [
     "Use a named constant defined once, with a static assertion if needed",
     "Add a comment next to each use that explains what 3 means",
     "Write the number in hexadecimal so it is easier to search for",
     "Define the macro separately in each file that needs it"
   ],
   "A single definition prevents inconsistent copies and gives traceability from requirement to code. `_Static_assert` (C11) or an equivalent compile-time check can enforce relationships between constants."],
  ["What does `_Static_assert` give that a run-time `assert` does not?",
   "_Static_assert(sizeof(Msg_t) == 8U, \"Msg_t layout changed\");",
   [
     "A compile-time check with no run-time cost that fails the build",
     "A check that runs before `main` on every reset",
     "A check that can read hardware registers during start-up",
     "A check that disables compiler warnings for the tested expression"
   ],
   "Static assertions evaluate constant expressions during compilation, ideal for sizes, offsets and configuration consistency. A run-time `assert` runs only on the paths that execute, and in production builds it may be disabled."],
  ["A 64-bit counter is incremented in an ISR and read in `main` on a 32-bit MCU. What is the correct way to read it?",
   "volatile uint64_t total;",
   [
     "Read it inside a critical section, or retry with a sequence counter",
     "Read it directly, because `volatile` makes 64-bit reads atomic",
     "Cast it to `uint32_t` and ignore the upper half of the counter",
     "Declare it `static` so the compiler reads it only once"
   ],
   "On a 32-bit core a 64-bit load is at least two accesses, so the ISR can change the counter between them and give a torn value. Disable interrupts briefly, use a seqlock-style retry, or provide a snapshot function."],
  ["What does the term 'implementation-defined behaviour' mean?",
   null,
   [
     "The standard allows several results and the compiler documents its choice",
     "Any result is allowed and the compiler documents nothing",
     "The compiler rejects the program at compile time",
     "The result is the same on every compiler by definition"
   ],
   "Implementation-defined behaviour is documented per compiler (for example `char` signedness, the right shift of negative values). Code that relies on it must record the assumption, ideally with a static assertion, and is not portable."],
  ["Which C type is the best choice for a counter that must be exactly 16 bits wide with wrap-around semantics on every target?",
   null,
   [
     "`uint16_t`, casting the result back after arithmetic",
     "`int`, because it has at least 16 bits",
     "`short`, because a signed type wraps around predictably",
     "`unsigned`, because it is the natural width of the machine"
   ],
   "Fixed-width unsigned types give defined wrap-around modulo 2^16 for the stored value. Because of integer promotion, the intermediate expression is computed in `int`, so cast the result back (`(uint16_t)(a + b)`). Signed types give undefined behaviour on overflow."],
  ["Why is `char` a poor type for numeric data in embedded C?",
   null,
   [
     "Whether plain `char` is signed is implementation-defined",
     "It is always 16 bits wide, so it wastes memory",
     "It cannot be used in arrays of numbers",
     "It is always unsigned on every platform, so negative values cannot be stored"
   ],
   "Use `uint8_t` or `int8_t` for numbers and keep `char` for text. On some Arm toolchains plain `char` is unsigned and on x86 it is usually signed, which changes behaviour on values above 127."],
  ["What is the key risk of using `goto` to jump out of nested loops into a common cleanup label?",
   null,
   [
     "Forward jumps to one exit can be acceptable, but backward jumps hamper analysis",
     "`goto` is not part of the C language",
     "Every `goto` doubles the stack use of the function",
     "`goto` prevents the use of `const` variables in the function"
   ],
   "MISRA C:2012 advises against `goto` (Rule 15.1) and, where it is used, requires forward jumps (15.2) to a label in an enclosing block (15.3). Verify the rule numbers against your edition. Many teams ban it outright. Whatever the rule, the control flow must remain analysable for structural coverage."],
  ["Which statement about `volatile` and compiler memory ordering between two different volatile objects is correct?",
   null,
   [
     "The compiler keeps volatile accesses ordered, but the CPU may reorder them",
     "`volatile` inserts a DMB instruction before every access automatically",
     "`volatile` also orders all non-volatile accesses around it",
     "`volatile` makes accesses atomic across cores"
   ],
   "The C abstract machine orders volatile accesses with respect to each other, but that is only a compiler guarantee. Write buffers, caches and out-of-order cores may still reorder, so use the architecture's barrier instructions (for example `DMB`/`DSB`) where ordering matters."],
  ["What is the typical purpose of a linker script in an embedded project?",
   null,
   [
     "To define memory regions and place sections at specific addresses",
     "To check the C syntax of the source files before compilation",
     "To translate C source into assembly language",
     "To generate the project documentation"
   ],
   "The linker script describes the memory map and where each output section goes, and it exports symbols (for example section start and end) used by the start-up code. Wrong placement shows up as hard faults, unexpected values or overlaps listed in the map file."],
  ["What can go wrong when a `const` object is accessed through a cast that removes `const` and is then written?",
   "const uint8_t cfg = 5U;\n*(uint8_t *)&cfg = 6U;",
   [
     "Undefined behaviour: the object may be in read-only memory and fault",
     "It always works, because `const` is only a comment for readers",
     "The linker rejects the program when it finds the cast",
     "The write goes to a hidden copy and is always visible to later reads"
   ],
   "Modifying an object defined `const` is undefined behaviour even through a cast. The value may be in flash (so the write faults or is ignored) or folded into code as a constant. Removing `const` is only valid when the underlying object was not defined `const`."]
]);
window.QUIZ_ADD("c", [
  ["What does this expression evaluate to in C99 or later?",
   "int a = -7, b = 2;\nint q = a / b;\nint r = a % b;",
   [
     "q is -3 and r is -1: division truncates toward zero",
     "q is -4 and r is 1, because division rounds toward minus infinity",
     "q is -3 and r is 1, because `%` always returns a positive value",
     "Both results are implementation-defined on every target"
   ],
   "Since C99, integer division truncates toward zero and `(a / b) * b + a % b == a`. So -7 / 2 is -3 and -7 % 2 is -1. Before C99 the rounding for negative operands was implementation-defined. Code that needs floor or modulo behaviour must implement it."],
  ["Which expression is undefined behaviour for `int32_t` operands on a 32-bit-int target?",
   null,
   [
     "`INT32_MIN / -1`, because the result does not fit in `int32_t`",
     "`INT32_MAX / 2`, because it halves the largest positive value",
     "`-5 % 3`, because the dividend is negative",
     "`7 / 2`, because the result is truncated"
   ],
   "The mathematical result 2 147 483 648 does not fit in `int32_t`, so the division overflows (and `INT32_MIN % -1` is also undefined). Code that divides by values it does not control must check for zero divisors and for this case."],
  ["What does `abs(INT_MIN)` return on a two's-complement target?",
   null,
   [
     "Undefined behaviour, because +2^31 is not representable in `int`",
     "Always 2147483648, computed in a wider type",
     "Always 0, because the sign bit is cleared",
     "Always -1, as an error indication"
   ],
   "The most negative value has no positive counterpart in two's complement. The standard says the behaviour is undefined if the result cannot be represented. Compilers may return `INT_MIN` unchanged, but code must not rely on that. Check the range or use a wider type first."],
  ["What is the behaviour of converting a `float` with the value 3.0e10 to `int32_t`?",
   "float f = 3.0e10f;\nint32_t i = (int32_t)f;",
   [
     "Undefined behaviour: the value is out of the target integer range",
     "It saturates to INT32_MAX on every target",
     "It wraps modulo 2^32 like an unsigned conversion",
     "It is rejected at compile time because the value is a constant"
   ],
   "Converting a floating value whose integer part cannot be represented is undefined in C. Hardware may saturate (for example Arm `VCVT`), but that cannot be assumed from the language. Range-check before the cast, or use a saturating helper."],
  ["A rotate-left helper is written as shown. For which `n` is it problematic?",
   "uint32_t rotl(uint32_t x, unsigned n) { return (x << n) | (x >> (32U - n)); }",
   [
     "`n == 0`, because `x >> 32` is undefined behaviour",
     "`n == 1`, because the sign bit is shifted",
     "`n == 31`, because almost all bits are shifted out",
     "Every value of `n`, because shifts are not allowed on unsigned types"
   ],
   "With `n == 0` the right shift count is 32, which is not less than the type width. Use `(x << (n & 31U)) | (x >> ((32U - n) & 31U))` or the compiler's rotate intrinsic. Compilers usually recognise the masked form and emit a single rotate instruction."],
  ["A saturating add for `uint8_t` is needed. Which implementation is correct?",
   null,
   ["`uint16_t s = (uint16_t)a + b; return (s > 255U) ? 255U : (uint8_t)s;`",
    "`return a + b;`",
    "`return (uint8_t)(a + b);`",
    "`return (a + b) % 255;`"],
   "The sum is computed in a wider type, then clamped. Returning `a + b` converts back and silently wraps, and `% 255` is wrong for sums of 255 and 510. Saturating arithmetic is common in signal-processing and control code to avoid wrap-around surprises."],
  ["What is a common cause of a `size_t` loop that never ends?",
   "for (size_t i = n - 1U; i >= 0U; i--) { use(i); }",
   [
     "`i >= 0U` is always true, so the counter wraps to SIZE_MAX",
     "`size_t` cannot be used as a `for` loop variable",
     "`i--` is not allowed on unsigned types",
     "The loop body is never executed because `n - 1U` is evaluated first"
   ],
   "Unsigned values never go below zero, so the condition cannot become false. Write the loop as `for (size_t i = n; i-- > 0U; )` or count up. Static analysers and compiler warnings (`-Wtype-limits`) report the always-true comparison."],
  ["Which expression is the safest way to test whether `a + b` overflows for `uint32_t` operands?",
   null,
   ["`(a > UINT32_MAX - b)`",
    "`(a + b < 0)`",
    "`(a + b > UINT32_MAX)`",
    "`((int32_t)(a + b) < 0)`"],
   "For unsigned types, test before adding: the sum overflows exactly when `a > UINT32_MAX - b`. `a + b > UINT32_MAX` is always false, and `< 0` is always false for unsigned values. Signed overflow cannot be detected after the fact, because it is undefined."],
  ["Why should a function that returns an error code be called with its return value checked, according to most embedded coding standards?",
   null,
   [
     "An ignored return value hides failures, and MISRA C requires it be used",
     "Compilers refuse to compile code that ignores a return value",
     "Return values consume stack, so they should normally be ignored",
     "The linker sets ignored return values to zero"
   ],
   "Unchecked errors turn into silent wrong behaviour later. MISRA C:2012 Rule 17.7 says the return value of a non-void function shall be used, with an explicit `(void)` cast documenting a deliberate decision. Verify the rule number in your edition."],
  ["Which approach to a null pointer parameter is the most appropriate in a Level A or B safety-related function?",
   null,
   [
     "Define and check the behaviour, return an error or safe state, and test it",
     "Assume callers never pass `NULL` and skip the check to save time",
     "Use an `assert` only and compile it out in the release build",
     "Dereference the pointer and let the hardware fault handler deal with it"
   ],
   "Robustness must be defined and verified: the response to invalid input is part of the requirements, and the test must reach the check. An `assert` that is compiled out gives no protection in the delivered code, and relying on an undefined fault is not a defined behaviour."],
  ["What does a compiler barrier such as `asm volatile(\"\" ::: \"memory\")` (GCC-style) provide?",
   null,
   [
     "It stops compiler reordering but emits no CPU barrier instruction",
     "A full hardware memory barrier that orders accesses between cores",
     "It disables interrupts for the following statement",
     "It flushes the data cache to memory"
   ],
   "A compiler barrier only constrains compiler reordering. Ordering against other cores, DMA or write buffers also needs hardware barriers (for example Arm `DMB`/`DSB`). The syntax and effect are compiler-specific, so verify them in your toolchain documentation."],
  ["Why can calling `printf` with a `float` argument inside an ISR be unacceptable?",
   null,
   [
     "It is not re-entrant, has unbounded run time and may allocate memory",
     "`printf` cannot print numeric values at all",
     "ISRs cannot be written in C",
     "A `float` argument is always promoted to `char` first"
   ],
   "Library I/O is slow, uses large stacks and often shared state, so it breaks the timing and re-entrancy that ISRs need. Log to a buffer from the ISR (bounded work) and format in a lower-priority task. Variadic `float` arguments are promoted to `double`, which also adds cost on cores without a double-precision FPU."],
  ["On a Cortex-M4F (single-precision FPU only), what hidden cost does this expression have?",
   "float a = 1.5f;\nfloat b = a * 2.0;",
   [
     "`2.0` is a `double`, so the maths runs in software double precision",
     "None, because the compiler always treats `2.0` as `float`",
     "The expression does not compile on a single-precision FPU",
     "The multiplication is carried out in integer arithmetic"
   ],
   "Unsuffixed floating constants have type `double`, which promotes the other operand. On an FPU that supports only single precision, this calls software floating-point routines. Use `2.0f`, and consider compiler options that warn about implicit promotion."],
  ["Which statement about the C `union` for type punning (reading a different member from the one last written) is the most accurate?",
   null,
   [
     "The bytes are reinterpreted, but may be a trap representation; use `memcpy`",
     "It is undefined behaviour in every version of C",
     "It is always well defined and gives the same result on every target",
     "It only works for pointer members"
   ],
   "In C the bytes of the stored value are reinterpreted, subject to representations and endianness, so the result depends on the platform. MISRA C restricts unions, and `memcpy` of fixed size is optimised to the same code. Check your standard and compiler documentation for the exact rule."],
  ["A design needs a counter that is incremented in an ISR and cleared in a task, on a single-core MCU. Which is the minimal correct mechanism for a 32-bit aligned counter on Cortex-M3/M4?",
   null,
   [
     "Make it `volatile` and protect the read-modify-write with a critical section",
     "Make it `volatile` only, because `counter++` and `counter = 0` are then always safe together",
     "Use a `float` so the update takes a single instruction",
     "Declare it `static` so only one function can modify it"
   ],
   "A plain store is atomic for an aligned 32-bit word, but `counter++` in the ISR and a clear-after-read in the task form a read-modify-write that can lose an update. Wrap it with `PRIMASK` handling or use `LDREX/STREX` (check the core supports them)."],
  ["What is the purpose of the `__attribute__((weak))` (GCC-style) on a default interrupt handler in a vector table?",
   null,
   [
     "The application can override the default with a strong definition",
     "It makes the handler run at a lower priority",
     "It removes the handler from flash when it is unused",
     "It makes the handler re-entrant"
   ],
   "A weak symbol is used only if no strong definition exists, so start-up code can supply default handlers that loop or fault, and the application replaces the ones it needs. The attribute syntax is toolchain-specific."],
  ["A DMA controller requires its buffer to be 32-byte aligned (cache-line size). Which declaration expresses this reliably in GCC-style C?",
   null,
   [
     "`static uint8_t buf[256] __attribute__((aligned(32)));`, or C11 `_Alignas(32)` on the declaration",
     "`static uint8_t buf[256];` and rely on the linker placing it on a suitable address",
     "`static uint8_t *buf = (uint8_t *)0x20000001;` pointing at a fixed odd address",
     "`volatile uint8_t buf[256];`, because `volatile` implies cache-line alignment"
   ],
   "An explicit alignment specifier tells the compiler and linker to place the object correctly, and you can add `_Static_assert` on the address check at start-up. `volatile` does not control alignment, and a random address is not portable."],
  ["Which order of members gives the smallest `sizeof` for this struct on a typical 32-bit ABI (natural alignment)?",
   null,
   [
     "`uint32_t a; uint16_t b; uint8_t c;`, from the largest member to the smallest",
     "`uint8_t c; uint32_t a; uint16_t b;`, with the smallest member first",
     "`uint16_t b; uint32_t a; uint8_t c;`, with the mid-sized member first",
     "The order never changes the size, because the compiler always reorders members"
   ],
   "Sorting members from largest to smallest alignment usually minimises padding: 4 + 2 + 1 plus 1 byte tail padding = 8 bytes. The other orders add padding inside the struct (12 bytes). Verify with `sizeof` and `offsetof` on the real compiler."],
  ["What is the most important property of a function to be called from both an ISR and a task?",
   null,
   [
     "It must be re-entrant: no unprotected shared state and no blocking calls",
     "It must be declared `inline` so that the call has no overhead",
     "It must take no parameters so that no stack is used",
     "It must be written in assembly so that the compiler cannot reorder it"
   ],
   "If an ISR interrupts the task while it is inside the same function, shared state can be corrupted. Re-entrant functions use only their parameters and automatic variables, or protect shared data. Blocking is not allowed in an ISR."],
  ["A function takes `const uint8_t *data, size_t len` and reads `data[len]` in its loop `for (i = 0; i <= len; i++)`. What is the defect and how is it best found?",
   null,
   [
     "An off-by-one over-read; review, static analysis or boundary tests find it",
     "No defect, because `<=` is the correct way to loop over `len` elements",
     "An unsigned overflow of the loop variable `i`",
     "A missing `volatile` on the pointer `data`"
   ],
   "Valid indices are 0 to len - 1. Off-by-one errors are common at boundaries, so boundary-value tests (length 0, 1, max) together with static analysis and requirement-based tests are effective. In DO-178C context, robustness tests belong to the verification of the requirements."],
  ["A project compiles with `-Wall -Wextra` and treats warnings as errors. Which is the best reason this is a good practice for embedded C?",
   null,
   [
     "Many defects, such as sign comparisons and uninitialised variables, are caught",
     "Warnings make the generated code smaller",
     "Warnings are never useful, so errors should be ignored",
     "It removes the need for code review and static analysis"
   ],
   "A warning-clean build in the agreed configuration is cheap, repeatable evidence and is usually part of the coding standard. It complements, but does not replace, static analysis and review. Record the compiler version and options as part of the configuration."],
  ["Why is the order `volatile` access then `DSB` then `WFI` used when waiting for an interrupt after clearing a flag in a peripheral?",
   null,
   [
     "The barrier makes sure the write has completed before the core sleeps",
     "`DSB` raises the clock speed so the core wakes faster",
     "`WFI` requires a `DSB` as its operand",
     "`DSB` clears all pending interrupt flags in the NVIC"
   ],
   "On Arm cores, a store to a peripheral may still be in a write buffer when the next instruction runs. A `DSB` before `WFI` (or before re-enabling interrupts) ensures completion. The exact need depends on the core and bus, so check the architecture and vendor documentation."]
]);
window.QUIZ_ADD("c", [
  ["What does this function return when called as `f(0x80U)`?",
   "int8_t f(uint8_t x) { return (int8_t)x; }",
   [
     "Implementation-defined: it is -128 on common compilers, but not guaranteed",
     "Always 128, because the value keeps its magnitude",
     "Always 0, because the value does not fit in 8 bits signed",
     "Undefined behaviour in every case, because the value is out of range"
   ],
   "Converting an out-of-range value to a signed type gives an implementation-defined result (or raises an implementation-defined signal) in C. Common compilers wrap modulo 256. Document the assumption or avoid the conversion by working in a wider type."],
  ["Which loop condition is the safest way to walk an array of `N` elements and avoid reading past the end?",
   "#define N 8U\nuint16_t a[N];",
   [
     "`for (uint32_t i = 0U; i < N; i++) { a[i] = 0U; }`, which visits indices 0 to N - 1",
     "`for (uint32_t i = 0U; i <= N; i++) { a[i] = 0U; }`, which also writes `a[N]`",
     "`for (uint32_t i = 1U; i <= N; i++) { a[i] = 0U; }`, which also writes `a[N]`",
     "`for (uint32_t i = 0U; i != N + 1U; i++) { a[i] = 0U; }`, which also writes `a[N]`"
   ],
   "Indices run from 0 to N - 1. The three wrong loops all write `a[N]`, which is one past the end (undefined behaviour). Expressing the bound with a named constant also lets static analysis check it."],
  ["A function modifies a global while an ISR can call the same function. What is the first design question to ask?",
   null,
   [
     "Which data is shared, and what protects it or who owns it",
     "Whether the function name is short enough to be readable",
     "Whether the function can be written with fewer lines",
     "Whether the global can be declared `register` to make it faster"
   ],
   "Shared data needs an explicit ownership and protection design. That design is then verified with analysis and tests. Making the code shorter or using different storage keywords does not address the race."],
  ["What does `offsetof` give you in a safety-related project?",
   "_Static_assert(offsetof(Hdr_t, crc) == 6U, \"layout\");",
   [
     "The byte offset of a member, which a static assertion can check",
     "The run-time address of the member in the current object",
     "The size of the whole struct including tail padding",
     "The alignment requirement of the first member"
   ],
   "`offsetof` (from `<stddef.h>`) is a constant expression usable in static assertions. It documents and enforces assumptions about padding that an interface depends on."],
  ["Which statement describes a 'trap representation'?",
   null,
   [
     "A bit pattern that is not a valid value of its type",
     "A breakpoint instruction inserted by a debugger",
     "A pointer that holds the address of a function",
     "A special value of the `NULL` pointer"
   ],
   "Some types can have bit patterns that are not valid values (for example, padding bits or certain pointer or integer representations on some targets). Reading an uninitialised object may involve such patterns. Initialise all objects and avoid reading padding."],
  ["Why is reading an uninitialised automatic variable dangerous even if it 'usually works'?",
   "int x;\nif (cond) { x = 1; }\nuse(x);",
   [
     "The value is indeterminate, so the optimiser may assume `cond` is true",
     "The variable is always zero in C, so the read is safe",
     "The compiler always inserts an initialisation, so the read is harmless",
     "It only matters on 8-bit CPUs"
   ],
   "Automatic variables are not zeroed. The optimiser can exploit the undefined read, for example by removing the `if` test. Initialise at declaration, and enable warnings such as `-Wuninitialized` and static analysis."],
  ["Which of these is the correct way to define an array size from an enum for use in a static array?",
   null,
   [
     "Add a final enumerator such as `LED_COUNT` and use it as the size",
     "Hard-code the number in every array declaration",
     "Use a variable-length array sized from the count",
     "Use `malloc` with the count at start-up"
   ],
   "A terminal count enumerator keeps arrays and enums in step, and a `_Static_assert` can check that the table has the right number of initialisers. Hard-coded numbers drift when the enum changes."],
  ["In fixed-point (Q15) code, what typical problem occurs when adding two Q15 values with a plain `int16_t` sum?",
   null,
   [
     "The sum can overflow and wrap, so use a wider type and saturate",
     "The result is always exact, because Q15 has 15 fractional bits",
     "The sum is converted to floating point automatically",
     "The binary point moves 15 places to the left"
   ],
   "Q15 numbers cover -1.0 to just below +1.0, so adding two large values exceeds the range. Use a 32-bit accumulator and saturate or scale. Choose and document the overflow policy for each calculation."],
  ["Which choice for the loop counter in a hot loop on a 32-bit MCU usually gives the best code size and speed without losing correctness?",
   null,
   [
     "`uint_fast16_t` or a native-width type, if the range fits",
     "`uint8_t` in every case, because it is the smallest type",
     "`double`, because it has the largest range",
     "`char`, because it is the shortest keyword"
   ],
   "Using the native word size avoids extra sign or zero extension instructions. The `_fast` types are chosen by the implementation, so verify the width if the range matters. Narrower types in loop counters can add masking instructions."],
  ["What is the primary purpose of the MISRA C 'Directive 4.12': dynamic memory allocation shall not be used?",
   null,
   [
     "To avoid undefined behaviour, variable timing and fragmentation",
     "To make `malloc` faster on small targets",
     "To force the use of C++ instead of C",
     "To allow `realloc` while forbidding `malloc`"
   ],
   "The directive removes the allocator's variable timing, failure paths and fragmentation from safety software. Teams who need allocation implement a bounded pool. Confirm the directive number and wording in your MISRA edition and amendments."],
  ["A bug appears only in a release build. Which is the most useful first investigation step?",
   null,
   [
     "Compare the generated code and map file, and look for undefined behaviour",
     "Remove all comments from the source",
     "Add more `printf` calls, because logging never changes timing",
     "Switch to a different programming language"
   ],
   "Optimisation exposes latent defects and changes timing. Static analysis, sanitiser-like checks on a host build, and a disassembly review of the failing function are standard steps. Debug-only fixes just hide the cause."],
  ["How is a critical section commonly implemented on a single-core Cortex-M to be safe to nest?",
   null,
   [
     "Save PRIMASK, disable interrupts, and restore the saved value on exit",
     "Always call `__enable_irq()` when leaving the section",
     "Disable interrupts on entry and never re-enable them",
     "Use a global `int` flag without `volatile`"
   ],
   "Restoring the previous state means a critical section entered with interrupts already off leaves them off. Unconditional enabling breaks outer sections and can cause priority and latency problems. Keep sections short and bounded."],
  ["What is the typical hazard of blocking inside a critical section (interrupts disabled)?",
   null,
   [
     "Latency grows without bound, and a wait for an interrupt can deadlock",
     "None, because interrupts are not needed while waiting",
     "The compiler removes the critical section",
     "The stack grows by one byte per second"
   ],
   "Disabled interrupts delay every interrupt by the time spent inside, and waiting for an event that arrives by interrupt can never end. Critical sections must be short, bounded and free of loops that depend on external events."],
  ["How should a safety-related function check a received length field before copying a payload?",
   "uint8_t dst[32];\nmemcpy(dst, src, len);",
   [
     "Check `len <= sizeof dst` before copying, and define the error response",
     "Trust the sender, because the CRC already passed",
     "Use `strcpy` instead of `memcpy`",
     "Copy first and check the length afterwards"
   ],
   "A CRC proves the message was not corrupted in transit, not that the sender's length is valid for this buffer. Bounds must be validated at the point of use, with robustness tests for lengths 0, max, and max + 1."],
  ["Which statement about `enum` types in C is correct?",
   null,
   [
     "The underlying integer type is implementation-defined",
     "An enum is always exactly 8 bits wide",
     "An enum can only hold declared values; others are rejected at run time",
     "An enum variable is range-checked automatically on assignment"
   ],
   "C enums are integers with implementation-defined size (compilers may use options such as `-fshort-enums`). An out-of-range value can still be stored. For wire formats use fixed-width integers and convert explicitly, with validation."],
  ["What is the effect of `-fno-strict-aliasing` (GCC-style) on code that relies on type punning through pointers?",
   null,
   [
     "It stops the compiler assuming no aliasing, which hides the problem",
     "It makes the type punning defined by the C standard",
     "It removes all undefined behaviour from the program",
     "It switches strict aliasing on"
   ],
   "The flag is a pragmatic workaround for existing code. It changes the language dialect used, so the certification evidence must record it, and the preferred fix is correct code with `memcpy` or unions. The flag name and effect are compiler-specific."],
  ["A recursive function is needed for a tree walk with depth up to 20. The standard forbids recursion. What is a suitable alternative?",
   null,
   [
     "An iterative version with a statically sized stack and an overflow check",
     "Keep the recursion and hope the stack is large enough",
     "Use `alloca` to grow the stack as needed",
     "Use `setjmp` and `longjmp` as the loop"
   ],
   "An explicit stack with a design-time bound makes worst-case memory visible and checkable, and the overflow check gives defined error behaviour. Recursion (and `alloca`) make stack use hard to bound, which is why they are restricted."],
  ["Which `printf`-family function is the safest for formatting into a fixed buffer?",
   null,
   ["`snprintf` with the buffer size, then check the return value for truncation",
    "`sprintf`",
    "`gets`",
    "`strcat` with unchecked inputs"],
   "`snprintf` limits the number of bytes written and returns the length that would have been needed, so truncation can be detected. `sprintf` has no limit. In very constrained or safety code, library formatting may itself be banned, so use a simple bounded formatter."],
  ["What is the issue with using the result of `sizeof` in a signed comparison such as `if (n < sizeof buf)` where `n` is `int`?",
   null,
   [
     "`n` converts to `size_t`, so a negative `n` becomes a huge value",
     "`sizeof` returns a negative value for some types",
     "The comparison is always true",
     "`sizeof` is not allowed in a condition"
   ],
   "A negative `n` converts to a large unsigned value, so `n < sizeof buf` is false and a negative length can slip past, depending on the check's direction. Use an unsigned length type from the start, or test for negative values explicitly."],
  ["Which coding style best supports MC/DC and structural coverage analysis of a complex condition?",
   null,
   [
     "Split it into named Boolean sub-conditions and avoid side effects",
     "Combine as many conditions as possible into one expression",
     "Put function calls with side effects inside the condition",
     "Use the comma operator to add extra tests"
   ],
   "Smaller decisions need fewer tests and give clearer independence pairs. Side effects in conditions complicate short-circuit analysis. Keep each decision traceable to a requirement, and do not hide logic to improve a coverage figure."],
  ["After reset, a variable placed in a `.noinit` section (not zeroed or loaded) is read. What value does it have?",
   null,
   [
     "Whatever the RAM held: indeterminate after power-up, so validate it",
     "Always 0, because the start-up code zeroes all RAM",
     "Always the C initialiser, because it is copied from flash",
     "Always 0xFF, as in erased flash"
   ],
   "A no-init section is skipped by the start-up code, which is useful for keeping a reset reason or crash log across warm resets. After power-up the content is random, so it must be validated before use. The section name and handling are toolchain-specific."],
  ["What is the safest way to declare a function that takes no parameters in C?",
   null,
   [
     "`void f(void);`, because `void f();` leaves the parameters unspecified",
     "`void f();`, because an empty list forbids all arguments",
     "`void f(...);`, because the ellipsis means no arguments",
     "`void f(null);`, because `null` marks an empty list"
   ],
   "In C (before C23) an empty parameter list means 'unspecified', so a call with arguments is not diagnosed. `(void)` declares and prototypes no parameters. MISRA C requires prototypes. Check how your C standard version treats it."]
]);
window.QUIZ_ADD("c", [
  ["Why does this macro cause a bug when used as `if (x) DEBUG_LOG(\"a\"); else other();`?",
   "#define DEBUG_LOG(s) log(s); counter++;",
   [
     "It expands to two statements, so the `else` no longer matches the `if`",
     "Macros cannot contain semicolons",
     "`log` is a reserved word in C",
     "The `else` is always executed"
   ],
   "Multi-statement macros should be wrapped in `do { ... } while (0)` so they behave as one statement, or replaced by a function. MISRA C restricts function-like macros for exactly this kind of hazard."],
  ["A cast from `void *` to a function pointer type is used to call an address read from a table. Why is it problematic in portable C?",
   null,
   [
     "The standard does not define such conversions, and MISRA C forbids them",
     "`void *` is always 8 bits wide",
     "Function pointers cannot be called through a table",
     "The cast always changes the numeric value of the address"
   ],
   "Data and function pointers can have different representations (for example on Harvard architectures), so the standard does not define the conversion. Store function pointers with function pointer types and keep tables typed."]
]);
