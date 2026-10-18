const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const mysql = require("mysql2");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ------------------------------------------------------------
// DATABASE CONNECTIONS
// ------------------------------------------------------------

if (process.env.MONGO_URI) {
    mongoose
        .connect(process.env.MONGO_URI)
        .then(() => console.log("MongoDB Connected Successfully"))
        .catch((error) =>
            console.error("MongoDB Connection Error:", error.message)
        );
} else {
    console.log(
        "MongoDB URI not configured; MySQL remains the primary application database."
    );
}

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: false
});

db.connect(async (error) => {
    if (error) {
        console.error("MySQL Connection Error:", error.message);
        return;
    }

    console.log("MySQL Connected Successfully");

    try {
        await initializeDatabase();
    } catch (dbInitError) {
        console.error("Database initialization failed:", dbInitError.message);
    }
});

async function initializeDatabase() {
    await queryDb(`
        CREATE TABLE IF NOT EXISTS departments (
            department_id INT AUTO_INCREMENT PRIMARY KEY,
            department_name VARCHAR(150) NOT NULL,
            department_code VARCHAR(50) NOT NULL UNIQUE
        ) ENGINE=InnoDB
    `);

    await queryDb(`
        CREATE TABLE IF NOT EXISTS users (
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(150) NOT NULL,
            email VARCHAR(150) NOT NULL UNIQUE,
            password VARCHAR(100) NOT NULL,
            role ENUM('Student', 'Faculty', 'Admin') NOT NULL,
            department_id INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments(department_id)
                ON DELETE SET NULL
        ) ENGINE=InnoDB
    `);

    await queryDb(`
        CREATE TABLE IF NOT EXISTS students (
            student_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL UNIQUE,
            register_number VARCHAR(50) NOT NULL UNIQUE,
            cgpa DECIMAL(4,2) DEFAULT 0,
            semester INT DEFAULT 1,
            previous_project_experience TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB
    `);

    await queryDb(`
        CREATE TABLE IF NOT EXISTS faculty (
            faculty_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL UNIQUE,
            employee_id VARCHAR(50) NOT NULL UNIQUE,
            designation VARCHAR(100),
            specialization VARCHAR(150),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB
    `);

    await queryDb(`
        CREATE TABLE IF NOT EXISTS skills (
            skill_id INT AUTO_INCREMENT PRIMARY KEY,
            skill_name VARCHAR(100) NOT NULL UNIQUE,
            skill_category VARCHAR(100),
            description TEXT
        ) ENGINE=InnoDB
    `);

    await queryDb(`
        CREATE TABLE IF NOT EXISTS student_skills (
            student_skill_id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            skill_id INT NOT NULL,
            proficiency_level ENUM('Beginner', 'Intermediate', 'Advanced') NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_student_skill (student_id, skill_id),
            CONSTRAINT fk_student_skill_skill
                FOREIGN KEY (skill_id) REFERENCES skills(skill_id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB
    `);

    const defaultSkills = [
        ["Python", "Programming"],
        ["JavaScript", "Programming"],
        ["React", "Frontend"],
        ["Node.js", "Backend"],
        ["SQL", "Database"],
        ["Machine Learning", "AI"],
        ["Data Analysis", "Analytics"],
        ["Research Writing", "Communication"],
        ["Team Collaboration", "Soft Skills"],
        ["Problem Solving", "General"]
    ];

    for (const [skillName, category] of defaultSkills) {
        await queryDb(
            `INSERT IGNORE INTO skills (skill_name, skill_category)
             VALUES (?, ?)`,
            [skillName, category]
        );
    }

    const defaultUsers = [
        {
            full_name: "Student One",
            email: "student1@college.edu",
            password: "student1",
            role: "Student"
        },
        {
            full_name: "Student Two",
            email: "student2@college.edu",
            password: "student2",
            role: "Student"
        },
        {
            full_name: "Faculty One",
            email: "faculty1@college.edu",
            password: "faculty1",
            role: "Faculty"
        },
        {
            full_name: "Faculty Two",
            email: "faculty2@college.edu",
            password: "faculty2",
            role: "Faculty"
        }
    ];

    for (const user of defaultUsers) {
        const existing = await queryDb(
            `SELECT user_id FROM users WHERE LOWER(email) = ? LIMIT 1`,
            [normalizeEmail(user.email)]
        );

        if (!existing.length) {
            const userResult = await queryDb(
                `INSERT INTO users (full_name, email, password, role, department_id)
                 VALUES (?, ?, ?, ?, NULL)`,
                [user.full_name, normalizeEmail(user.email), user.password, user.role]
            );

            if (user.role === "Student") {
                const registerNumber = `STU${String(userResult.insertId).padStart(4, "0")}`;
                await queryDb(
                    `INSERT IGNORE INTO students (user_id, register_number, cgpa, semester, previous_project_experience)
                     VALUES (?, ?, 0, 1, 'No')`,
                    [userResult.insertId, registerNumber]
                );
            }

            if (user.role === "Faculty") {
                await queryDb(
                    `INSERT IGNORE INTO faculty (user_id, employee_id, designation, specialization)
                     VALUES (?, ?, ?, ?)`,
                    [userResult.insertId, `FAC${String(userResult.insertId).padStart(4, "0")}`, "Assistant Professor", "Research Coordination"]
                );
            }
        }
    }

    console.log("Database tables and default demo accounts ensured");
}

function queryDb(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (error, results) => {
            if (error) {
                return reject(error);
            }

            resolve(results);
        });
    });
}

function sendError(res, status, message, error) {
    console.error(
        message,
        error?.message || error || ""
    );

    return res.status(status).json({
        message,
        error: error?.message || undefined
    });
}

function num(value, fallback = null) {
    const n = Number(value);

    return Number.isFinite(n)
        ? n
        : fallback;
}

function clamp(
    value,
    min,
    max,
    fallback = min
) {
    const n = num(value, fallback);

    return Math.min(
        max,
        Math.max(min, n)
    );
}

function normalizeEmail(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

function nameFromEmail(email) {
    return email
        .split("@")[0]
        .replace(/[._-]+/g, " ")
        .replace(
            /\b\w/g,
            (c) => c.toUpperCase()
        );
}

async function getEnumValues(
    tableName,
    columnName
) {
    const rows = await queryDb(
        `SELECT COLUMN_TYPE
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?
         LIMIT 1`,
        [
            tableName,
            columnName
        ]
    );

    if (!rows.length) {
        return [];
    }

    const type = String(
        rows[0].COLUMN_TYPE || ""
    );

    if (!type.startsWith("enum(")) {
        return [];
    }

    return type
        .slice(5, -1)
        .split(",")
        .map(
            (v) =>
                v
                    .trim()
                    .replace(/^'/, "")
                    .replace(/'$/, "")
                    .replace(/''/g, "'")
        );
}

async function safeEnumValue(
    table,
    column,
    requested,
    fallback = null
) {
    try {
        const allowed =
            await getEnumValues(
                table,
                column
            );

        if (!allowed.length) {
            return (
                requested ??
                fallback
            );
        }

        if (
            requested !== undefined &&
            requested !== null &&
            allowed.includes(
                String(requested)
            )
        ) {
            return String(requested);
        }

        if (
            fallback !== null &&
            allowed.includes(
                String(fallback)
            )
        ) {
            return String(fallback);
        }

        return allowed[0] ?? null;
    } catch {
        return (
            requested ??
            fallback
        );
    }
}

async function notifyUser(
    userId,
    title,
    message,
    notificationType = "System"
) {
    if (!userId) {
        return;
    }

    try {
        const safeType =
            await safeEnumValue(
                "notifications",
                "notification_type",
                notificationType,
                null
            );

        await queryDb(
            `INSERT INTO notifications
             (user_id, title, message, notification_type)
             VALUES (?, ?, ?, ?)`,
            [
                userId,
                title,
                message,
                safeType
            ]
        );
    } catch (error) {
        console.error(
            "Notification creation failed:",
            error.message
        );
    }
}

async function notifyFacultyById(
    facultyId,
    title,
    message,
    type = "System"
) {
    if (!facultyId) {
        return;
    }

    const rows = await queryDb(
        `SELECT user_id
         FROM faculty
         WHERE faculty_id = ?
         LIMIT 1`,
        [facultyId]
    );

    if (rows.length) {
        await notifyUser(
            rows[0].user_id,
            title,
            message,
            type
        );
    }
}

async function notifyStudentById(
    studentId,
    title,
    message,
    type = "System"
) {
    if (!studentId) {
        return;
    }

    const rows = await queryDb(
        `SELECT user_id
         FROM students
         WHERE student_id = ?
         LIMIT 1`,
        [studentId]
    );

    if (rows.length) {
        await notifyUser(
            rows[0].user_id,
            title,
            message,
            type
        );
    }
}

async function getProject(
    projectId
) {
    const rows = await queryDb(
        `SELECT *
         FROM research_projects
         WHERE project_id = ?
         LIMIT 1`,
        [projectId]
    );

    return rows[0] || null;
}

async function getStudent(
    studentId
) {
    const rows = await queryDb(
        `SELECT *
         FROM students
         WHERE student_id = ?
         LIMIT 1`,
        [studentId]
    );

    return rows[0] || null;
}

async function getFaculty(
    facultyId
) {
    const rows = await queryDb(
        `SELECT *
         FROM faculty
         WHERE faculty_id = ?
         LIMIT 1`,
        [facultyId]
    );

    return rows[0] || null;
}

async function getTeam(
    teamId
) {
    const rows = await queryDb(
        `SELECT *
         FROM project_teams
         WHERE team_id = ?
         LIMIT 1`,
        [teamId]
    );

    return rows[0] || null;
}

// ------------------------------------------------------------
// ROOT / HEALTH
// ------------------------------------------------------------

app.get("/", (req, res) => {
    res.json({
        message:
            "ResearchHub Backend is Running",
        database:
            process.env.DB_NAME ||
            "research_project_system",
        port: PORT
    });
});

app.get(
    "/api/health",
    async (req, res) => {
        try {
            const rows =
                await queryDb(
                    "SELECT 1 AS ok"
                );

            res.json({
                status: "ok",
                mysql:
                    rows[0]?.ok === 1
                        ? "connected"
                        : "unknown"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Database health check failed",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// AUTHENTICATION
// Password rule:
// example@email.com -> password = example
// New emails become Student accounts automatically.
// ------------------------------------------------------------

app.post(
    "/api/login",
    async (req, res) => {
            const email =
            normalizeEmail(
                req.body.email
            );

        const requestedRole =
            String(
                req.body.role ||
                    "Student"
            )
                .trim();

        if (
            !["Student", "Faculty"].includes(
                requestedRole
            )
        ) {
            return res.status(400).json({
                message:
                    "Role must be Student or Faculty"
            });
        }

        const password =
            String(
                req.body.password || ""
            )
                .trim()
                .toLowerCase();

        if (
            !email ||
            !email.includes("@")
        ) {
            return res.status(400).json({
                message:
                    "Please enter a valid email address"
            });
        }

        const prefix =
            email.split("@")[0];

        if (!prefix) {
            return res.status(400).json({
                message:
                    "Invalid email address"
            });
        }

        if (
            password !== prefix
        ) {
            return res.status(401).json({
                message:
                    `Password should be "${prefix}"`
            });
        }

        try {
            const users =
                await queryDb(
                    `SELECT
                        user_id,
                        full_name,
                        email,
                        role,
                        department_id
                     FROM users
                     WHERE LOWER(email) = ?
                     LIMIT 1`,
                    [email]
                );

            if (users.length) {
                const user =
                    users[0];

                if (
                    user.role !==
                    requestedRole
                ) {
                    return res.status(403).json({
                        message:
                            `This account is registered as ${user.role}. Please log in as the correct role.`
                    });
                }

                // STUDENT
                if (
                    user.role ===
                    "Student"
                ) {
                    let students =
                        await queryDb(
                            `SELECT
                                student_id,
                                register_number,
                                cgpa,
                                semester,
                                previous_project_experience
                             FROM students
                             WHERE user_id = ?
                             LIMIT 1`,
                            [user.user_id]
                        );

                    if (!students.length) {
                        const registerNumber =
                            `AUTO${String(
                                user.user_id
                            ).padStart(
                                4,
                                "0"
                            )}`;

                        const result =
                            await queryDb(
                                `INSERT INTO students
                                (
                                    user_id,
                                    register_number,
                                    cgpa,
                                    semester,
                                    previous_project_experience
                                )
                                VALUES (?, ?, 0, 1, 'No')`,
                                [
                                    user.user_id,
                                    registerNumber
                                ]
                            );

                        students = [
                            {
                                student_id:
                                    result.insertId,
                                register_number:
                                    registerNumber,
                                cgpa: 0,
                                semester: 1,
                                previous_project_experience:
                                    "No"
                            }
                        ];
                    }

                    return res.json({
                        message:
                            "Login successful",

                        user: {
                            ...user,

                            student_id:
                                students[0]
                                    .student_id,

                            register_number:
                                students[0]
                                    .register_number,

                            cgpa:
                                students[0]
                                    .cgpa,

                            semester:
                                students[0]
                                    .semester,

                            previous_project_experience:
                                students[0]
                                    .previous_project_experience
                        }
                    });
                }

                // FACULTY
                if (
                    user.role ===
                    "Faculty"
                ) {
                    const faculty =
                        await queryDb(
                            `SELECT
                                faculty_id,
                                employee_id,
                                designation,
                                specialization
                             FROM faculty
                             WHERE user_id = ?
                             LIMIT 1`,
                            [user.user_id]
                        );

                    if (!faculty.length) {
                        const employeeId =
                            `FAC${String(
                                user.user_id
                            ).padStart(
                                4,
                                "0"
                            )}`;

                        await queryDb(
                            `INSERT INTO faculty
                            (
                                user_id,
                                employee_id,
                                designation,
                                specialization
                            )
                            VALUES (?, ?, ?, ?)`,
                            [
                                user.user_id,
                                employeeId,
                                "Assistant Professor",
                                "Research Coordination"
                            ]
                        );
                    }

                    const facultyRecord =
                        await queryDb(
                            `SELECT
                                faculty_id,
                                employee_id,
                                designation,
                                specialization
                             FROM faculty
                             WHERE user_id = ?
                             LIMIT 1`,
                            [user.user_id]
                        );

                    return res.json({
                        message:
                            "Login successful",

                        user: {
                            ...user,

                            faculty_id:
                                facultyRecord[0]
                                    ?.faculty_id ||
                                null,

                            employee_id:
                                facultyRecord[0]
                                    ?.employee_id ||
                                null,

                            designation:
                                facultyRecord[0]
                                    ?.designation ||
                                null,

                            specialization:
                                facultyRecord[0]
                                    ?.specialization ||
                                null
                        }
                    });
                }

                // ADMIN OR ANY OTHER ROLE
                return res.json({
                    message:
                        "Login successful",
                    user
                });
            }

            const fullName =
                nameFromEmail(
                    email
                );

            const userResult =
                await queryDb(
                    `INSERT INTO users
                    (
                        full_name,
                        email,
                        password,
                        role,
                        department_id
                    )
                    VALUES (?, ?, ?, ?, NULL)`,
                    [
                        fullName,
                        email,
                        prefix,
                        requestedRole
                    ]
                );

            if (
                requestedRole ===
                "Student"
            ) {
                const registerNumber =
                    `AUTO${String(
                        userResult.insertId
                    ).padStart(
                        4,
                        "0"
                    )}`;

                const studentResult =
                    await queryDb(
                        `INSERT INTO students
                        (
                            user_id,
                            register_number,
                            cgpa,
                            semester,
                            previous_project_experience
                        )
                        VALUES (?, ?, 0, 1, 'No')`,
                        [
                            userResult.insertId,
                            registerNumber
                        ]
                    );

                return res
                    .status(201)
                    .json({
                        message:
                            "Account created and login successful",

                        user: {
                            user_id:
                                userResult.insertId,

                            full_name:
                                fullName,

                            email,

                            role:
                                "Student",

                            department_id:
                                null,

                            student_id:
                                studentResult.insertId,

                            register_number:
                                registerNumber,

                            cgpa: 0,

                            semester: 1,

                            previous_project_experience:
                                "No"
                        }
                    });
            }

            const employeeId =
                `FAC${String(
                    userResult.insertId
                ).padStart(
                    4,
                    "0"
                )}`;

            await queryDb(
                `INSERT INTO faculty
                (
                    user_id,
                    employee_id,
                    designation,
                    specialization
                )
                VALUES (?, ?, ?, ?)`,
                [
                    userResult.insertId,
                    employeeId,
                    "Assistant Professor",
                    "Research Coordination"
                ]
            );

            return res
                .status(201)
                .json({
                    message:
                        "Faculty account created and login successful",

                    user: {
                        user_id:
                            userResult.insertId,

                        full_name:
                            fullName,

                        email,

                        role:
                            "Faculty",

                        department_id:
                            null,

                        faculty_id:
                            userResult.insertId,

                        employee_id:
                            employeeId,

                        designation:
                            "Assistant Professor",

                        specialization:
                            "Research Coordination"
                    }
                });
        } catch (error) {
            sendError(
                res,
                500,
                "Login failed",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// USERS
// ------------------------------------------------------------

app.get(
    "/api/users",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        user_id,
                        full_name,
                        email,
                        role,
                        department_id,
                        created_at
                     FROM users
                     ORDER BY user_id DESC`
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch users",
                error
            );
        }
    }
);

app.get(
    "/api/users/:id",
    async (req, res) => {
        try {
            const rows =
                await queryDb(
                    `SELECT
                        user_id,
                        full_name,
                        email,
                        role,
                        department_id,
                        created_at
                     FROM users
                     WHERE user_id = ?
                     LIMIT 1`,
                    [req.params.id]
                );

            if (!rows.length) {
                return res.status(
                    404
                ).json({
                    message:
                        "User not found"
                });
            }

            res.json(rows[0]);
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch user",
                error
            );
        }
    }
);

app.post(
    "/api/users",
    async (req, res) => {
        const {
            full_name,
            email,
            password,
            role,
            department_id
        } = req.body;

        if (
            !full_name ||
            !email ||
            !password ||
            !role
        ) {
            return res.status(
                400
            ).json({
                message:
                    "full_name, email, password and role are required"
            });
        }

        try {
            const result =
                await queryDb(
                    `INSERT INTO users
                    (
                        full_name,
                        email,
                        password,
                        role,
                        department_id
                    )
                    VALUES (?, ?, ?, ?, ?)`,
                    [
                        full_name,
                        normalizeEmail(
                            email
                        ),
                        password,
                        role,
                        department_id ||
                            null
                    ]
                );

            res.status(201).json({
                message:
                    "User created successfully",
                user_id:
                    result.insertId
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to create user",
                error
            );
        }
    }
);

app.put(
    "/api/users/:id",
    async (req, res) => {
        const {
            full_name,
            email,
            password,
            role,
            department_id
        } = req.body;

        try {
            const result =
                await queryDb(
                    `UPDATE users SET
                        full_name =
                            COALESCE(?, full_name),
                        email =
                            COALESCE(?, email),
                        password =
                            COALESCE(?, password),
                        role =
                            COALESCE(?, role),
                        department_id =
                            COALESCE(
                                ?,
                                department_id
                            )
                     WHERE user_id = ?`,
                    [
                        full_name,
                        email
                            ? normalizeEmail(email)
                            : null,
                        password,
                        role,
                        department_id,
                        req.params.id
                    ]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "User not found"
                });
            }

            res.json({
                message:
                    "User updated successfully"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to update user",
                error
            );
        }
    }
);

app.delete(
    "/api/users/:id",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `DELETE FROM users
                     WHERE user_id = ?`,
                    [req.params.id]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "User not found"
                });
            }

            res.json({
                message:
                    "User deleted successfully"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to delete user",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// DEPARTMENTS
// ------------------------------------------------------------

app.get(
    "/api/departments",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT *
                     FROM departments
                     ORDER BY department_name`
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch departments",
                error
            );
        }
    }
);

app.get(
    "/api/departments/:id",
    async (req, res) => {
        try {
            const rows =
                await queryDb(
                    `SELECT *
                     FROM departments
                     WHERE department_id = ?
                     LIMIT 1`,
                    [req.params.id]
                );

            if (!rows.length) {
                return res.status(
                    404
                ).json({
                    message:
                        "Department not found"
                });
            }

            res.json(rows[0]);
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch department",
                error
            );
        }
    }
);

app.post(
    "/api/departments",
    async (req, res) => {
        const {
            department_name,
            department_code
        } = req.body;

        if (
            !department_name ||
            !department_code
        ) {
            return res.status(
                400
            ).json({
                message:
                    "department_name and department_code are required"
            });
        }

        try {
            const result =
                await queryDb(
                    `INSERT INTO departments
                    (
                        department_name,
                        department_code
                    )
                    VALUES (?, ?)`,
                    [
                        department_name,
                        department_code
                    ]
                );

            res.status(201).json({
                message:
                    "Department created successfully",
                department_id:
                    result.insertId
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to create department",
                error
            );
        }
    }
);

app.put(
    "/api/departments/:id",
    async (req, res) => {
        const {
            department_name,
            department_code
        } = req.body;

        try {
            const result =
                await queryDb(
                    `UPDATE departments
                     SET
                        department_name =
                            COALESCE(
                                ?,
                                department_name
                            ),
                        department_code =
                            COALESCE(
                                ?,
                                department_code
                            )
                     WHERE department_id = ?`,
                    [
                        department_name,
                        department_code,
                        req.params.id
                    ]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Department not found"
                });
            }

            res.json({
                message:
                    "Department updated successfully"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to update department",
                error
            );
        }
    }
);

app.delete(
    "/api/departments/:id",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `DELETE FROM departments
                     WHERE department_id = ?`,
                    [req.params.id]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Department not found"
                });
            }

            res.json({
                message:
                    "Department deleted successfully"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to delete department",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// FACULTY
// ------------------------------------------------------------

app.get(
    "/api/faculty",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        f.*,
                        u.full_name,
                        u.email,
                        u.department_id
                     FROM faculty f
                     JOIN users u
                       ON u.user_id = f.user_id
                     ORDER BY f.faculty_id DESC`
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch faculty",
                error
            );
        }
    }
);

app.get(
    "/api/faculty/:id",
    async (req, res) => {
        try {
            const rows =
                await queryDb(
                    `SELECT
                        f.*,
                        u.full_name,
                        u.email,
                        u.department_id
                     FROM faculty f
                     JOIN users u
                       ON u.user_id = f.user_id
                     WHERE f.faculty_id = ?
                     LIMIT 1`,
                    [req.params.id]
                );

            if (!rows.length) {
                return res.status(
                    404
                ).json({
                    message:
                        "Faculty not found"
                });
            }

            res.json(rows[0]);
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch faculty",
                error
            );
        }
    }
);

app.post(
    "/api/faculty",
    async (req, res) => {
        const {
            user_id,
            employee_id,
            designation,
            specialization
        } = req.body;

        if (
            !user_id ||
            !employee_id
        ) {
            return res.status(
                400
            ).json({
                message:
                    "user_id and employee_id are required"
            });
        }

        try {
            const result =
                await queryDb(
                    `INSERT INTO faculty
                    (
                        user_id,
                        employee_id,
                        designation,
                        specialization
                    )
                    VALUES (?, ?, ?, ?)`,
                    [
                        user_id,
                        employee_id,
                        designation ||
                            null,
                        specialization ||
                            null
                    ]
                );

            res.status(201).json({
                message:
                    "Faculty created successfully",
                faculty_id:
                    result.insertId
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to create faculty",
                error
            );
        }
    }
);

app.put(
    "/api/faculty/:id",
    async (req, res) => {
        const {
            employee_id,
            designation,
            specialization
        } = req.body;

        try {
            const result =
                await queryDb(
                    `UPDATE faculty SET
                        employee_id =
                            COALESCE(
                                ?,
                                employee_id
                            ),
                        designation =
                            COALESCE(
                                ?,
                                designation
                            ),
                        specialization =
                            COALESCE(
                                ?,
                                specialization
                            )
                     WHERE faculty_id = ?`,
                    [
                        employee_id,
                        designation,
                        specialization,
                        req.params.id
                    ]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Faculty not found"
                });
            }

            res.json({
                message:
                    "Faculty updated successfully"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to update faculty",
                error
            );
        }
    }
);

app.delete(
    "/api/faculty/:id",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `DELETE FROM faculty
                     WHERE faculty_id = ?`,
                    [req.params.id]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Faculty not found"
                });
            }

            res.json({
                message:
                    "Faculty deleted successfully"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to delete faculty",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// STUDENTS
// ------------------------------------------------------------

app.get(
    "/api/students",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        s.*,
                        u.full_name,
                        u.email,
                        u.role,
                        u.department_id
                     FROM students s
                     JOIN users u
                       ON u.user_id = s.user_id
                     ORDER BY s.student_id DESC`
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch students",
                error
            );
        }
    }
);

app.get(
    "/api/students/:id",
    async (req, res) => {
        try {
            const rows =
                await queryDb(
                    `SELECT
                        s.*,
                        u.full_name,
                        u.email,
                        u.role,
                        u.department_id
                     FROM students s
                     JOIN users u
                       ON u.user_id = s.user_id
                     WHERE s.student_id = ?
                     LIMIT 1`,
                    [req.params.id]
                );

            if (!rows.length) {
                return res.status(
                    404
                ).json({
                    message:
                        "Student not found"
                });
            }

            res.json(rows[0]);
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch student",
                error
            );
        }
    }
);

app.post(
    "/api/students",
    async (req, res) => {
        const {
            user_id,
            register_number,
            cgpa,
            semester,
            previous_project_experience
        } = req.body;

        if (
            !user_id ||
            !register_number
        ) {
            return res.status(
                400
            ).json({
                message:
                    "user_id and register_number are required"
            });
        }

        try {
            const result =
                await queryDb(
                    `INSERT INTO students
                    (
                        user_id,
                        register_number,
                        cgpa,
                        semester,
                        previous_project_experience
                    )
                    VALUES (?, ?, ?, ?, ?)`,
                    [
                        user_id,
                        register_number,
                        cgpa ?? 0,
                        semester ?? 1,
                        previous_project_experience ||
                            "No"
                    ]
                );

            res.status(201).json({
                message:
                    "Student created successfully",
                student_id:
                    result.insertId
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to create student",
                error
            );
        }
    }
);

app.put(
    "/api/students/:id",
    async (req, res) => {
        const {
            register_number,
            cgpa,
            semester,
            previous_project_experience
        } = req.body;

        try {
            const result =
                await queryDb(
                    `UPDATE students SET
                        register_number =
                            COALESCE(
                                ?,
                                register_number
                            ),
                        cgpa =
                            COALESCE(
                                ?,
                                cgpa
                            ),
                        semester =
                            COALESCE(
                                ?,
                                semester
                            ),
                        previous_project_experience =
                            COALESCE(
                                ?,
                                previous_project_experience
                            )
                     WHERE student_id = ?`,
                    [
                        register_number,
                        cgpa,
                        semester,
                        previous_project_experience,
                        req.params.id
                    ]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Student not found"
                });
            }

            res.json({
                message:
                    "Student updated successfully"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to update student",
                error
            );
        }
    }
);

app.delete(
    "/api/students/:id",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `DELETE FROM students
                     WHERE student_id = ?`,
                    [req.params.id]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Student not found"
                });
            }

            res.json({
                message:
                    "Student deleted successfully"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to delete student",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// PROJECTS
// Specific routes are deliberately before /:id.
// ------------------------------------------------------------

app.get(
    "/api/projects/status/approved",
    async (req, res) => {
        try {
            const rows =
                await queryDb(
                    `SELECT
                        rp.*,
                        u.full_name AS faculty_name,
                        d.department_name,
                        d.department_code
                     FROM research_projects rp
                     LEFT JOIN faculty f
                       ON f.faculty_id =
                          rp.faculty_id
                     LEFT JOIN users u
                       ON u.user_id =
                          f.user_id
                     LEFT JOIN departments d
                       ON d.department_id =
                          rp.department_id
                     WHERE rp.status IN
                        (
                            'Approved',
                            'Open',
                            'Ongoing'
                        )
                     ORDER BY
                        rp.created_at DESC`
                );

            res.json(rows);
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch approved projects",
                error
            );
        }
    }
);

app.get(
    "/api/projects",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        rp.*,
                        u.full_name AS faculty_name,
                        u.email AS faculty_email,
                        d.department_name,
                        d.department_code
                     FROM research_projects rp
                     LEFT JOIN faculty f
                       ON f.faculty_id =
                          rp.faculty_id
                     LEFT JOIN users u
                       ON u.user_id =
                          f.user_id
                     LEFT JOIN departments d
                       ON d.department_id =
                          rp.department_id
                     ORDER BY rp.created_at DESC`
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch projects",
                error
            );
        }
    }
);

app.get(
    "/api/projects/:id/history",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        psh.*,
                        u.full_name AS changer_name
                     FROM project_status_history psh
                     LEFT JOIN users u
                       ON u.user_id =
                          psh.changed_by
                     WHERE
                        psh.project_id = ?
                     ORDER BY
                        psh.changed_at DESC`,
                    [req.params.id]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch project history",
                error
            );
        }
    }
);

app.get(
    "/api/projects/:id",
    async (req, res) => {
        try {
            const rows =
                await queryDb(
                    `SELECT
                        rp.*,
                        u.full_name AS faculty_name,
                        u.email AS faculty_email,
                        d.department_name,
                        d.department_code
                     FROM research_projects rp
                     LEFT JOIN faculty f
                       ON f.faculty_id =
                          rp.faculty_id
                     LEFT JOIN users u
                       ON u.user_id =
                          f.user_id
                     LEFT JOIN departments d
                       ON d.department_id =
                          rp.department_id
                     WHERE
                        rp.project_id = ?
                     LIMIT 1`,
                    [req.params.id]
                );

            if (!rows.length) {
                return res.status(
                    404
                ).json({
                    message:
                        "Project not found"
                });
            }

            res.json(rows[0]);
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch project",
                error
            );
        }
    }
);

app.post(
    "/api/projects",
    async (req, res) => {
        const {
            faculty_id,
            department_id,
            project_title,
            project_description,
            minimum_cgpa,
            maximum_team_size,
            application_deadline
        } = req.body;

        if (
            !faculty_id ||
            !department_id ||
            !project_title ||
            !maximum_team_size
        ) {
            return res.status(
                400
            ).json({
                message:
                    "faculty_id, department_id, project_title and maximum_team_size are required"
            });
        }

        try {
            const result =
                await queryDb(
                    `INSERT INTO research_projects
                    (
                        faculty_id,
                        department_id,
                        project_title,
                        project_description,
                        minimum_cgpa,
                        maximum_team_size,
                        application_deadline,
                        status
                    )
                    VALUES
                    (?, ?, ?, ?, ?, ?, ?, 'Pending Approval')`,
                    [
                        faculty_id,
                        department_id,
                        project_title,
                        project_description ||
                            null,
                        minimum_cgpa ??
                            0,
                        Math.max(
                            1,
                            Number(
                                maximum_team_size
                            )
                        ),
                        application_deadline ||
                            null
                    ]
                );

            res.status(201).json({
                message:
                    "Project proposal created successfully",
                project_id:
                    result.insertId,
                status:
                    "Pending Approval"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to create project",
                error
            );
        }
    }
);

app.put(
    "/api/projects/:id",
    async (req, res) => {
        const {
            project_title,
            project_description,
            minimum_cgpa,
            maximum_team_size,
            application_deadline,
            status
        } = req.body;

        try {
            const old =
                await getProject(
                    req.params.id
                );

            if (!old) {
                return res.status(
                    404
                ).json({
                    message:
                        "Project not found"
                });
            }

            const result =
                await queryDb(
                    `UPDATE research_projects SET
                        project_title =
                            COALESCE(
                                ?,
                                project_title
                            ),
                        project_description =
                            COALESCE(
                                ?,
                                project_description
                            ),
                        minimum_cgpa =
                            COALESCE(
                                ?,
                                minimum_cgpa
                            ),
                        maximum_team_size =
                            COALESCE(
                                ?,
                                maximum_team_size
                            ),
                        application_deadline =
                            COALESCE(
                                ?,
                                application_deadline
                            ),
                        status =
                            COALESCE(
                                ?,
                                status
                            )
                     WHERE project_id = ?`,
                    [
                        project_title,
                        project_description,
                        minimum_cgpa,
                        maximum_team_size,
                        application_deadline,
                        status,
                        req.params.id
                    ]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Project not found"
                });
            }

            if (
                status &&
                status !== old.status
            ) {
                const faculty =
                    await getFaculty(
                        old.faculty_id
                    );

                await queryDb(
                    `INSERT INTO project_status_history
                    (
                        project_id,
                        old_status,
                        new_status,
                        changed_by,
                        change_reason
                    )
                    VALUES (?, ?, ?, ?, ?)`,
                    [
                        req.params.id,
                        old.status,
                        status,
                        faculty?.user_id ||
                            null,
                        "Project status updated"
                    ]
                );
            }

            res.json({
                message:
                    "Project updated successfully"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to update project",
                error
            );
        }
    }
);

app.delete(
    "/api/projects/:id",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `DELETE FROM research_projects
                     WHERE project_id = ?`,
                    [req.params.id]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Project not found"
                });
            }

            res.json({
                message:
                    "Project deleted successfully"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to delete project",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// PROJECT APPROVALS
// ------------------------------------------------------------

app.get(
    "/api/project-approvals",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        pa.*,
                        rp.project_title,
                        u.full_name AS reviewer_name
                     FROM project_approvals pa
                     JOIN research_projects rp
                       ON rp.project_id =
                          pa.project_id
                     LEFT JOIN users u
                       ON u.user_id =
                          pa.reviewed_by
                     ORDER BY
                        pa.reviewed_at DESC`
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch project approvals",
                error
            );
        }
    }
);

app.put(
    "/api/projects/:id/approval",
    async (req, res) => {
        const projectId =
            Number(req.params.id);

        const {
            decision,
            reviewed_by,
            review_comments
        } = req.body;

        if (
            !projectId ||
            !reviewed_by ||
            ![
                "Approved",
                "Rejected",
                "Revision Required"
            ].includes(decision)
        ) {
            return res.status(
                400
            ).json({
                message:
                    "Provide project id, reviewed_by and decision: Approved, Rejected, or Revision Required"
            });
        }

        try {
            const project =
                await getProject(
                    projectId
                );

            if (!project) {
                return res.status(
                    404
                ).json({
                    message:
                        "Project not found"
                });
            }

            const newStatus =
                decision ===
                "Revision Required"
                    ? "Pending Approval"
                    : decision;

            await queryDb(
                `INSERT INTO project_approvals
                (
                    project_id,
                    reviewed_by,
                    decision,
                    review_comments
                )
                VALUES (?, ?, ?, ?)`,
                [
                    projectId,
                    reviewed_by,
                    decision,
                    review_comments ||
                        null
                ]
            );

            await queryDb(
                `UPDATE research_projects
                 SET status = ?
                 WHERE project_id = ?`,
                [
                    newStatus,
                    projectId
                ]
            );

            await queryDb(
                `INSERT INTO project_status_history
                (
                    project_id,
                    old_status,
                    new_status,
                    changed_by,
                    change_reason
                )
                VALUES (?, ?, ?, ?, ?)`,
                [
                    projectId,
                    project.status,
                    newStatus,
                    reviewed_by,
                    review_comments ||
                        `Project ${decision}`
                ]
            );

            await notifyFacultyById(
                project.faculty_id,
                "Project Approval Updated",
                `Your project "${project.project_title}" is now ${newStatus}.`,
                "Project"
            );

            res.json({
                message:
                    `Project ${decision.toLowerCase()} successfully`,
                new_status:
                    newStatus
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to process project approval",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// SKILLS
// ------------------------------------------------------------

app.get(
    "/api/skills",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT *
                     FROM skills
                     ORDER BY skill_name`
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch skills",
                error
            );
        }
    }
);

app.post(
    "/api/skills",
    async (req, res) => {
        const {
            skill_name,
            skill_category,
            description
        } = req.body;

        if (!skill_name) {
            return res.status(
                400
            ).json({
                message:
                    "skill_name is required"
            });
        }

        try {
            const result =
                await queryDb(
                    `INSERT INTO skills
                    (
                        skill_name,
                        skill_category,
                        description
                    )
                    VALUES (?, ?, ?)`,
                    [
                        skill_name,
                        skill_category ||
                            null,
                        description ||
                            null
                    ]
                );

            res.status(201).json({
                message:
                    "Skill created",
                skill_id:
                    result.insertId
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to create skill",
                error
            );
        }
    }
);

app.put(
    "/api/skills/:id",
    async (req, res) => {
        const {
            skill_name,
            skill_category,
            description
        } = req.body;

        try {
            const result =
                await queryDb(
                    `UPDATE skills SET
                        skill_name =
                            COALESCE(
                                ?,
                                skill_name
                            ),
                        skill_category =
                            COALESCE(
                                ?,
                                skill_category
                            ),
                        description =
                            COALESCE(
                                ?,
                                description
                            )
                     WHERE skill_id = ?`,
                    [
                        skill_name,
                        skill_category,
                        description,
                        req.params.id
                    ]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Skill not found"
                });
            }

            res.json({
                message:
                    "Skill updated"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to update skill",
                error
            );
        }
    }
);

app.delete(
    "/api/skills/:id",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `DELETE FROM skills
                     WHERE skill_id = ?`,
                    [req.params.id]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Skill not found"
                });
            }

            res.json({
                message:
                    "Skill deleted"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to delete skill",
                error
            );
        }
    }
);

app.post(
    "/api/student-skills",
    async (req, res) => {
        const {
            student_id,
            skill_id,
            proficiency_level
        } = req.body;

        if (
            !student_id ||
            !skill_id ||
            !proficiency_level
        ) {
            return res.status(
                400
            ).json({
                message:
                    "student_id, skill_id and proficiency_level are required"
            });
        }

        try {
            const safe =
                await safeEnumValue(
                    "student_skills",
                    "proficiency_level",
                    proficiency_level,
                    null
                );

            const result =
                await queryDb(
                    `INSERT INTO student_skills
                    (
                        student_id,
                        skill_id,
                        proficiency_level
                    )
                    VALUES (?, ?, ?)`,
                    [
                        student_id,
                        skill_id,
                        safe
                    ]
                );

            res.status(201).json({
                message:
                    "Student skill added",
                student_skill_id:
                    result.insertId
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to add student skill",
                error
            );
        }
    }
);

app.get(
    "/api/student-skills/:studentId",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        ss.*,
                        s.skill_name,
                        s.skill_category
                     FROM student_skills ss
                     JOIN skills s
                       ON s.skill_id =
                          ss.skill_id
                     WHERE
                        ss.student_id = ?
                     ORDER BY
                        s.skill_name`,
                    [req.params.studentId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch student skills",
                error
            );
        }
    }
);

app.delete(
    "/api/student-skills/:id",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `DELETE FROM student_skills
                     WHERE student_skill_id = ?`,
                    [req.params.id]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Student skill not found"
                });
            }

            res.json({
                message:
                    "Student skill removed"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to remove student skill",
                error
            );
        }
    }
);

app.post(
    "/api/project-skills",
    async (req, res) => {
        const {
            project_id,
            skill_id,
            importance_level
        } = req.body;

        if (
            !project_id ||
            !skill_id ||
            !importance_level
        ) {
            return res.status(
                400
            ).json({
                message:
                    "project_id, skill_id and importance_level are required"
            });
        }

        try {
            const safe =
                await safeEnumValue(
                    "project_skills",
                    "importance_level",
                    importance_level,
                    null
                );

            const result =
                await queryDb(
                    `INSERT INTO project_skills
                    (
                        project_id,
                        skill_id,
                        importance_level
                    )
                    VALUES (?, ?, ?)`,
                    [
                        project_id,
                        skill_id,
                        safe
                    ]
                );

            res.status(201).json({
                message:
                    "Project skill added",
                project_skill_id:
                    result.insertId
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to add project skill",
                error
            );
        }
    }
);

app.get(
    "/api/project-skills/:projectId",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        ps.*,
                        s.skill_name,
                        s.skill_category
                     FROM project_skills ps
                     JOIN skills s
                       ON s.skill_id =
                          ps.skill_id
                     WHERE
                        ps.project_id = ?
                     ORDER BY
                        s.skill_name`,
                    [req.params.projectId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch project skills",
                error
            );
        }
    }
);

app.delete(
    "/api/project-skills/:id",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `DELETE FROM project_skills
                     WHERE project_skill_id = ?`,
                    [req.params.id]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Project skill not found"
                });
            }

            res.json({
                message:
                    "Project skill removed"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to remove project skill",
                error
            );
        }
    }
);

// Frontend aliases
app.get(
    "/api/students/:studentId/skills",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        ss.*,
                        s.skill_name,
                        s.skill_category
                     FROM student_skills ss
                     JOIN skills s
                       ON s.skill_id =
                          ss.skill_id
                     WHERE
                        ss.student_id = ?
                     ORDER BY
                        s.skill_name`,
                    [req.params.studentId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch student skills",
                error
            );
        }
    }
);

app.get(
    "/api/projects/:projectId/skills",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        ps.*,
                        s.skill_name,
                        s.skill_category
                     FROM project_skills ps
                     JOIN skills s
                       ON s.skill_id =
                          ps.skill_id
                     WHERE
                        ps.project_id = ?
                     ORDER BY
                        s.skill_name`,
                    [req.params.projectId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch project skills",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// PREFERENCES
// ------------------------------------------------------------

app.post(
    "/api/preferences",
    async (req, res) => {
        const {
            student_id,
            project_id,
            preference_rank
        } = req.body;

        if (
            !student_id ||
            !project_id ||
            num(preference_rank) ===
                null ||
            num(preference_rank) < 1
        ) {
            return res.status(
                400
            ).json({
                message:
                    "student_id, project_id and valid preference_rank are required"
            });
        }

        try {
            const existing =
                await queryDb(
                    `SELECT
                        preference_id
                     FROM project_preferences
                     WHERE
                        student_id = ?
                     AND
                        project_id = ?
                     LIMIT 1`,
                    [
                        student_id,
                        project_id
                    ]
                );

            let id;

            if (
                existing.length
            ) {
                await queryDb(
                    `UPDATE project_preferences
                     SET preference_rank = ?
                     WHERE preference_id = ?`,
                    [
                        preference_rank,
                        existing[0]
                            .preference_id
                    ]
                );

                id =
                    existing[0]
                        .preference_id;
            } else {
                const result =
                    await queryDb(
                        `INSERT INTO project_preferences
                        (
                            student_id,
                            project_id,
                            preference_rank
                        )
                        VALUES (?, ?, ?)`,
                        [
                            student_id,
                            project_id,
                            preference_rank
                        ]
                    );

                id =
                    result.insertId;
            }

            res.status(201).json({
                message:
                    "Preference saved",
                preference_id:
                    id
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to save preference",
                error
            );
        }
    }
);

app.get(
    "/api/preferences/student/:studentId",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        pp.*,
                        rp.project_title,
                        rp.status
                     FROM project_preferences pp
                     JOIN research_projects rp
                       ON rp.project_id =
                          pp.project_id
                     WHERE
                        pp.student_id = ?
                     ORDER BY
                        pp.preference_rank`,
                    [req.params.studentId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch preferences",
                error
            );
        }
    }
);

app.put(
    "/api/preferences/:id",
    async (req, res) => {
        const {
            preference_rank
        } = req.body;

        try {
            const result =
                await queryDb(
                    `UPDATE project_preferences
                     SET preference_rank = ?
                     WHERE preference_id = ?`,
                    [
                        preference_rank,
                        req.params.id
                    ]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Preference not found"
                });
            }

            res.json({
                message:
                    "Preference updated"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to update preference",
                error
            );
        }
    }
);

app.delete(
    "/api/preferences/:id",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `DELETE FROM project_preferences
                     WHERE preference_id = ?`,
                    [req.params.id]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Preference not found"
                });
            }

            res.json({
                message:
                    "Preference deleted"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to delete preference",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// COMPATIBILITY
// 40 Skill + 25 CGPA + 20 Preference + 15 Experience = 100
// ------------------------------------------------------------

async function calculateCompatibility(
    studentId,
    projectId
) {
    const student =
        await getStudent(
            studentId
        );

    const project =
        await getProject(
            projectId
        );

    if (!student) {
        throw new Error(
            "Student not found"
        );
    }

    if (!project) {
        throw new Error(
            "Project not found"
        );
    }

    const [
        projectSkills,
        studentSkills,
        preferences
    ] =
        await Promise.all([
            queryDb(
                `SELECT
                    skill_id,
                    importance_level
                 FROM project_skills
                 WHERE project_id = ?`,
                [projectId]
            ),

            queryDb(
                `SELECT
                    skill_id,
                    proficiency_level
                 FROM student_skills
                 WHERE student_id = ?`,
                [studentId]
            ),

            queryDb(
                `SELECT
                    preference_rank
                 FROM project_preferences
                 WHERE
                    student_id = ?
                 AND
                    project_id = ?
                 ORDER BY
                    preference_rank
                 LIMIT 1`,
                [
                    studentId,
                    projectId
                ]
            )
        ]);

    const proficiency = {
        Beginner: 1,
        Intermediate: 2,
        Advanced: 3
    };

    const importance = {
        Preferred: 1,
        Important: 2,
        Essential: 3
    };

    const skillMap =
        new Map(
            studentSkills.map(
                (row) => [
                    Number(
                        row.skill_id
                    ),
                    proficiency[
                        row.proficiency_level
                    ] || 0
                ]
            )
        );

    let possible = 0;
    let earned = 0;

    for (
        const requirement of
        projectSkills
    ) {
        const weight =
            importance[
                requirement
                    .importance_level
            ] || 1;

        possible += weight;

        earned +=
            weight *
            (
                (
                    skillMap.get(
                        Number(
                            requirement
                                .skill_id
                        )
                    ) || 0
                ) /
                3
            );
    }

    const skillScore =
        projectSkills.length
            ? (
                  earned /
                  possible
              ) *
              40
            : 40;

    const cgpa =
        Number(
            student.cgpa || 0
        );

    const minimumCgpa =
        Number(
            project.minimum_cgpa ||
                0
        );

    let cgpaScore = 0;
    let eligible = true;

    if (
        minimumCgpa > 0 &&
        cgpa < minimumCgpa
    ) {
        eligible = false;

        cgpaScore =
            Math.max(
                0,
                (
                    cgpa /
                    minimumCgpa
                ) *
                    12
            );
    } else if (
        minimumCgpa > 0
    ) {
        cgpaScore =
            Math.min(
                25,
                15 +
                    (
                        (
                            cgpa -
                            minimumCgpa
                        ) /
                        Math.max(
                            10 -
                                minimumCgpa,
                            1
                        )
                    ) *
                        10
            );
    } else {
        cgpaScore =
            Math.min(
                25,
                (cgpa / 10) * 25
            );
    }

    const rank =
        preferences.length
            ? Number(
                  preferences[0]
                      .preference_rank
              )
            : null;

    const preferenceScore =
        rank === 1
            ? 20
            : rank === 2
                ? 15
                : rank === 3
                    ? 10
                    : rank
                        ? 5
                        : 0;

    const experience =
        String(
            student.previous_project_experience ||
                ""
        ).toLowerCase();

    const experienceScore =
        [
            "yes",
            "1",
            "true"
        ].includes(
            experience
        )
            ? 15
            : 0;

    const totalScore =
        Math.min(
            100,
            skillScore +
                cgpaScore +
                preferenceScore +
                experienceScore
        );

    return {
        student_id:
            Number(studentId),

        project_id:
            Number(projectId),

        project_title:
            project.project_title,

        skill_score:
            Number(
                skillScore.toFixed(
                    2
                )
            ),

        cgpa_score:
            Number(
                cgpaScore.toFixed(
                    2
                )
            ),

        preference_score:
            Number(
                preferenceScore.toFixed(
                    2
                )
            ),

        experience_score:
            Number(
                experienceScore.toFixed(
                    2
                )
            ),

        total_score:
            Number(
                totalScore.toFixed(
                    2
                )
            ),

        eligible,

        minimum_cgpa:
            minimumCgpa,

        student_cgpa:
            cgpa
    };
}

async function saveCompatibility(
    score
) {
    const existing =
        await queryDb(
            `SELECT
                compatibility_id
             FROM compatibility_scores
             WHERE
                student_id = ?
             AND
                project_id = ?
             ORDER BY
                calculated_at DESC
             LIMIT 1`,
            [
                score.student_id,
                score.project_id
            ]
        );

    if (existing.length) {
        await queryDb(
            `UPDATE compatibility_scores
             SET
                skill_score = ?,
                cgpa_score = ?,
                preference_score = ?,
                experience_score = ?,
                total_score = ?,
                calculated_at =
                    CURRENT_TIMESTAMP
             WHERE
                compatibility_id = ?`,
            [
                score.skill_score,
                score.cgpa_score,
                score.preference_score,
                score.experience_score,
                score.total_score,
                existing[0]
                    .compatibility_id
            ]
        );

        return existing[0]
            .compatibility_id;
    }

    const result =
        await queryDb(
            `INSERT INTO compatibility_scores
            (
                student_id,
                project_id,
                skill_score,
                cgpa_score,
                preference_score,
                experience_score,
                total_score
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                score.student_id,
                score.project_id,
                score.skill_score,
                score.cgpa_score,
                score.preference_score,
                score.experience_score,
                score.total_score
            ]
        );

    return result.insertId;
}

app.get(
    "/api/compatibility/student/:studentId/project/:projectId",
    async (req, res) => {
        try {
            const score =
                await calculateCompatibility(
                    req.params.studentId,
                    req.params.projectId
                );

            const compatibility_id =
                await saveCompatibility(
                    score
                );

            res.json({
                compatibility_id,
                ...score
            });
        } catch (error) {
            sendError(
                res,
                error.message.includes(
                    "not found"
                )
                    ? 404
                    : 500,
                "Failed to calculate compatibility",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// RECOMMENDATIONS
// ------------------------------------------------------------

app.get(
    "/api/recommendations/projects/:studentId",
    async (req, res) => {
        const studentId =
            Number(
                req.params.studentId
            );

        try {
            if (
                !(await getStudent(
                    studentId
                ))
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Student not found"
                });
            }

            const projects =
                await queryDb(
                    `SELECT project_id
                     FROM research_projects
                     WHERE status IN
                        (
                            'Approved',
                            'Open',
                            'Ongoing'
                        )
                     ORDER BY
                        created_at DESC`
                );

            const recommendations =
                [];

            for (
                const project of
                projects
            ) {
                const score =
                    await calculateCompatibility(
                        studentId,
                        project.project_id
                    );

                const compatibility_id =
                    await saveCompatibility(
                        score
                    );

                recommendations.push({
                    compatibility_id,
                    ...score
                });
            }

            recommendations.sort(
                (a, b) =>
                    b.total_score -
                    a.total_score
            );

            await queryDb(
                `DELETE FROM project_recommendations
                 WHERE student_id = ?`,
                [studentId]
            );

            for (
                let i = 0;
                i <
                recommendations.length;
                i++
            ) {
                const recommendation =
                    recommendations[i];

                const reason =
                    `Compatibility ${recommendation.total_score}%: skills ${recommendation.skill_score}/40, CGPA ${recommendation.cgpa_score}/25, preference ${recommendation.preference_score}/20, experience ${recommendation.experience_score}/15`;

                const result =
                    await queryDb(
                        `INSERT INTO project_recommendations
                        (
                            student_id,
                            project_id,
                            compatibility_id,
                            recommendation_rank,
                            recommendation_reason
                        )
                        VALUES (?, ?, ?, ?, ?)`,
                        [
                            studentId,
                            recommendation.project_id,
                            recommendation.compatibility_id,
                            i + 1,
                            reason
                        ]
                    );

                recommendation.recommendation_id =
                    result.insertId;

                recommendation.recommendation_rank =
                    i + 1;

                recommendation.recommendation_reason =
                    reason;
            }

            res.json(
                recommendations
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to generate project recommendations",
                error
            );
        }
    }
);

app.get(
    "/api/recommendations/students/:projectId",
    async (req, res) => {
        const projectId =
            Number(
                req.params.projectId
            );

        try {
            if (
                !(await getProject(
                    projectId
                ))
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Project not found"
                });
            }

            const students =
                await queryDb(
                    `SELECT student_id
                     FROM students
                     ORDER BY student_id`
                );

            const recommendations =
                [];

            for (
                const student of
                students
            ) {
                const score =
                    await calculateCompatibility(
                        student.student_id,
                        projectId
                    );

                const compatibility_id =
                    await saveCompatibility(
                        score
                    );

                recommendations.push({
                    compatibility_id,
                    ...score
                });
            }

            recommendations.sort(
                (a, b) =>
                    b.total_score -
                    a.total_score
            );

            await queryDb(
                `DELETE FROM student_recommendations
                 WHERE project_id = ?`,
                [projectId]
            );

            for (
                let i = 0;
                i <
                recommendations.length;
                i++
            ) {
                const recommendation =
                    recommendations[i];

                const reason =
                    `Compatibility ${recommendation.total_score}% with project requirements`;

                const result =
                    await queryDb(
                        `INSERT INTO student_recommendations
                        (
                            project_id,
                            student_id,
                            compatibility_id,
                            recommendation_rank,
                            recommendation_reason
                        )
                        VALUES (?, ?, ?, ?, ?)`,
                        [
                            projectId,
                            recommendation.student_id,
                            recommendation.compatibility_id,
                            i + 1,
                            reason
                        ]
                    );

                recommendation.recommendation_id =
                    result.insertId;

                recommendation.recommendation_rank =
                    i + 1;

                recommendation.recommendation_reason =
                    reason;
            }

            res.json(
                recommendations
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to generate student recommendations",
                error
            );
        }
    }
);

app.get(
    "/api/students/:studentId/recommendations",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        pr.*,
                        rp.project_title,
                        rp.project_description,
                        rp.minimum_cgpa,
                        rp.maximum_team_size,
                        rp.application_deadline,
                        rp.status AS project_status,
                        cs.total_score
                     FROM project_recommendations pr
                     JOIN research_projects rp
                       ON rp.project_id =
                          pr.project_id
                     LEFT JOIN compatibility_scores cs
                       ON cs.compatibility_id =
                          pr.compatibility_id
                     WHERE
                        pr.student_id = ?
                     ORDER BY
                        pr.recommendation_rank`,
                    [req.params.studentId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch recommendations",
                error
            );
        }
    }
);

app.get(
    "/api/faculty/:facultyId/recommendations",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        sr.*,
                        rp.project_title,
                        s.register_number,
                        s.cgpa,
                        u.full_name AS student_name,
                        cs.total_score
                     FROM student_recommendations sr
                     JOIN research_projects rp
                       ON rp.project_id =
                          sr.project_id
                     JOIN students s
                       ON s.student_id =
                          sr.student_id
                     JOIN users u
                       ON u.user_id =
                          s.user_id
                     LEFT JOIN compatibility_scores cs
                       ON cs.compatibility_id =
                          sr.compatibility_id
                     WHERE
                        rp.faculty_id = ?
                     ORDER BY
                        sr.project_id,
                        sr.recommendation_rank`,
                    [req.params.facultyId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch faculty recommendations",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// APPLICATIONS
// Specific project route BEFORE /:id.
// ------------------------------------------------------------

app.get(
    "/api/applications/project/:projectId",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        pa.*,
                        s.register_number,
                        s.cgpa,
                        u.full_name AS student_name,
                        u.email AS student_email
                     FROM project_applications pa
                     JOIN students s
                       ON s.student_id =
                          pa.student_id
                     JOIN users u
                       ON u.user_id =
                          s.user_id
                     WHERE
                        pa.project_id = ?
                     ORDER BY
                        pa.application_date DESC`,
                    [req.params.projectId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch project applications",
                error
            );
        }
    }
);

app.get(
    "/api/students/:studentId/applications",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        pa.*,
                        rp.project_title,
                        rp.project_description,
                        rp.minimum_cgpa,
                        rp.maximum_team_size,
                        rp.application_deadline,
                        rp.status AS project_status,
                        u.full_name AS faculty_name
                     FROM project_applications pa
                     JOIN research_projects rp
                       ON rp.project_id =
                          pa.project_id
                     LEFT JOIN faculty f
                       ON f.faculty_id =
                          rp.faculty_id
                     LEFT JOIN users u
                       ON u.user_id =
                          f.user_id
                     WHERE
                        pa.student_id = ?
                     ORDER BY
                        pa.application_date DESC`,
                    [req.params.studentId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch student applications",
                error
            );
        }
    }
);

app.get(
    "/api/faculty/:facultyId/applications",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        pa.*,
                        rp.project_title,
                        s.register_number,
                        s.cgpa,
                        u.full_name AS student_name,
                        u.email AS student_email
                     FROM project_applications pa
                     JOIN research_projects rp
                       ON rp.project_id =
                          pa.project_id
                     JOIN students s
                       ON s.student_id =
                          pa.student_id
                     JOIN users u
                       ON u.user_id =
                          s.user_id
                     WHERE
                        rp.faculty_id = ?
                     ORDER BY
                        pa.application_date DESC`,
                    [req.params.facultyId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch faculty applications",
                error
            );
        }
    }
);

app.get(
    "/api/applications",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        pa.*,
                        rp.project_title,
                        s.register_number,
                        s.cgpa,
                        u.full_name AS student_name,
                        u.email AS student_email
                     FROM project_applications pa
                     JOIN research_projects rp
                       ON rp.project_id =
                          pa.project_id
                     JOIN students s
                       ON s.student_id =
                          pa.student_id
                     JOIN users u
                       ON u.user_id =
                          s.user_id
                     ORDER BY
                        pa.application_date DESC`
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch applications",
                error
            );
        }
    }
);

app.get(
    "/api/applications/:id",
    async (req, res) => {
        try {
            const rows =
                await queryDb(
                    `SELECT
                        pa.*,
                        rp.project_title,
                        s.register_number,
                        s.cgpa,
                        u.full_name AS student_name,
                        u.email AS student_email
                     FROM project_applications pa
                     JOIN research_projects rp
                       ON rp.project_id =
                          pa.project_id
                     JOIN students s
                       ON s.student_id =
                          pa.student_id
                     JOIN users u
                       ON u.user_id =
                          s.user_id
                     WHERE
                        pa.application_id = ?
                     LIMIT 1`,
                    [req.params.id]
                );

            if (!rows.length) {
                return res.status(
                    404
                ).json({
                    message:
                        "Application not found"
                });
            }

            res.json(rows[0]);
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch application",
                error
            );
        }
    }
);

app.post(
    "/api/applications",
    async (req, res) => {
        const {
            student_id,
            project_id
        } = req.body;

        if (
            !student_id ||
            !project_id
        ) {
            return res.status(
                400
            ).json({
                message:
                    "student_id and project_id are required"
            });
        }

        try {
            const student =
                await getStudent(
                    student_id
                );

            const project =
                await getProject(
                    project_id
                );

            if (!student) {
                return res.status(
                    404
                ).json({
                    message:
                        "Student not found"
                });
            }

            if (!project) {
                return res.status(
                    404
                ).json({
                    message:
                        "Project not found"
                });
            }

            if (
                ![
                    "Approved",
                    "Open"
                ].includes(
                    project.status
                )
            ) {
                return res.status(
                    400
                ).json({
                    message:
                        "Applications are closed for this project"
                });
            }

            if (
                project.minimum_cgpa !==
                    null &&
                Number(
                    student.cgpa || 0
                ) <
                    Number(
                        project.minimum_cgpa ||
                            0
                    )
            ) {
                return res.status(
                    400
                ).json({
                    message:
                        "Student does not meet the project's minimum CGPA requirement"
                });
            }

            if (
                project.application_deadline
            ) {
                const deadline =
                    new Date(
                        project.application_deadline
                    );

                if (
                    !Number.isNaN(
                        deadline.getTime()
                    ) &&
                    deadline <
                        new Date()
                ) {
                    return res.status(
                        400
                    ).json({
                        message:
                            "The application deadline has passed"
                    });
                }
            }

            const duplicate =
                await queryDb(
                    `SELECT
                        application_id,
                        status
                     FROM project_applications
                     WHERE
                        student_id = ?
                     AND
                        project_id = ?
                     LIMIT 1`,
                    [
                        student_id,
                        project_id
                    ]
                );

            if (duplicate.length) {
                return res.status(
                    409
                ).json({
                    message:
                        "Student has already applied to this project",
                    application_id:
                        duplicate[0]
                            .application_id,
                    status:
                        duplicate[0]
                            .status
                });
            }

            const applicationStatus =
                await safeEnumValue(
                    "project_applications",
                    "status",
                    "Pending",
                    null
                );

            const result =
                await queryDb(
                    `INSERT INTO project_applications
                    (
                        student_id,
                        project_id,
                        application_date,
                        status
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        CURRENT_TIMESTAMP,
                        ?
                    )`,
                    [
                        student_id,
                        project_id,
                        applicationStatus
                    ]
                );

            await notifyFacultyById(
                project.faculty_id,
                "New Project Application",
                `A student has applied to your project "${project.project_title}".`,
                "Application"
            );

            await notifyStudentById(
                student_id,
                "Application Submitted",
                `Your application for "${project.project_title}" was submitted successfully.`,
                "Application"
            );

            res.status(201).json({
                message:
                    "Application submitted successfully",
                application_id:
                    result.insertId,
                status:
                    applicationStatus
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to submit application",
                error
            );
        }
    }
);

async function updateApplicationStatus(
    applicationId,
    status,
    remarks
) {
    const applications =
        await queryDb(
            `SELECT
                pa.*,
                rp.project_title,
                rp.faculty_id
             FROM project_applications pa
             JOIN research_projects rp
               ON rp.project_id =
                  pa.project_id
             WHERE
                pa.application_id = ?
             LIMIT 1`,
            [applicationId]
        );

    if (!applications.length) {
        throw new Error(
            "Application not found"
        );
    }

    const safeStatus =
        await safeEnumValue(
            "project_applications",
            "status",
            status,
            null
        );

    await queryDb(
        `UPDATE project_applications
         SET
            status = ?,
            remarks =
                COALESCE(
                    ?,
                    remarks
                )
         WHERE
            application_id = ?`,
        [
            safeStatus,
            remarks || null,
            applicationId
        ]
    );

    await notifyStudentById(
        applications[0].student_id,
        "Application Status Updated",
        `Your application for "${applications[0].project_title}" is now ${safeStatus}.`,
        "Application"
    );

    return safeStatus;
}

app.put(
    "/api/applications/:id/review",
    async (req, res) => {
        const {
            status,
            remarks
        } = req.body;

        if (!status) {
            return res.status(
                400
            ).json({
                message:
                    "status is required"
            });
        }

        try {
            const safeStatus =
                await updateApplicationStatus(
                    req.params.id,
                    status,
                    remarks
                );

            res.json({
                message:
                    "Application reviewed successfully",
                status:
                    safeStatus
            });
        } catch (error) {
            sendError(
                res,
                error.message ===
                    "Application not found"
                    ? 404
                    : 500,
                "Failed to review application",
                error
            );
        }
    }
);

app.put(
    "/api/applications/:id",
    async (req, res) => {
        const {
            status,
            remarks
        } = req.body;

        try {
            const safeStatus =
                await updateApplicationStatus(
                    req.params.id,
                    status,
                    remarks
                );

            res.json({
                message:
                    "Application updated successfully",
                status:
                    safeStatus
            });
        } catch (error) {
            sendError(
                res,
                error.message ===
                    "Application not found"
                    ? 404
                    : 500,
                "Failed to update application",
                error
            );
        }
    }
);

app.delete(
    "/api/applications/:id",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `DELETE FROM project_applications
                     WHERE application_id = ?`,
                    [req.params.id]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Application not found"
                });
            }

            res.json({
                message:
                    "Application deleted successfully"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to delete application",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// WAITLIST
// ------------------------------------------------------------

app.post(
    "/api/waitlist",
    async (req, res) => {
        const {
            student_id,
            project_id
        } = req.body;

        if (
            !student_id ||
            !project_id
        ) {
            return res.status(
                400
            ).json({
                message:
                    "student_id and project_id are required"
            });
        }

        try {
            const duplicate =
                await queryDb(
                    `SELECT
                        waitlist_id,
                        waitlist_position,
                        status
                     FROM waitlist
                     WHERE
                        student_id = ?
                     AND
                        project_id = ?
                     LIMIT 1`,
                    [
                        student_id,
                        project_id
                    ]
                );

            if (duplicate.length) {
                return res.json({
                    message:
                        "Student is already on the waitlist",
                    ...duplicate[0]
                });
            }

            const next =
                await queryDb(
                    `SELECT
                        COALESCE(
                            MAX(
                                waitlist_position
                            ),
                            0
                        ) + 1
                        AS next_position
                     FROM waitlist
                     WHERE
                        project_id = ?`,
                    [project_id]
                );

            const safeStatus =
                await safeEnumValue(
                    "waitlist",
                    "status",
                    "Waiting",
                    null
                );

            const result =
                await queryDb(
                    `INSERT INTO waitlist
                    (
                        student_id,
                        project_id,
                        waitlist_position,
                        status
                    )
                    VALUES (?, ?, ?, ?)`,
                    [
                        student_id,
                        project_id,
                        next[0]
                            .next_position,
                        safeStatus
                    ]
                );

            res.status(201).json({
                message:
                    "Student added to waitlist",
                waitlist_id:
                    result.insertId,
                waitlist_position:
                    next[0]
                        .next_position,
                status:
                    safeStatus
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to add student to waitlist",
                error
            );
        }
    }
);

app.get(
    "/api/waitlist/project/:projectId",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        w.*,
                        s.register_number,
                        s.cgpa,
                        u.full_name AS student_name,
                        u.email
                     FROM waitlist w
                     JOIN students s
                       ON s.student_id =
                          w.student_id
                     JOIN users u
                       ON u.user_id =
                          s.user_id
                     WHERE
                        w.project_id = ?
                     ORDER BY
                        w.waitlist_position`,
                    [req.params.projectId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch waitlist",
                error
            );
        }
    }
);

app.put(
    "/api/waitlist/:id/status",
    async (req, res) => {
        const {
            status
        } = req.body;

        if (!status) {
            return res.status(
                400
            ).json({
                message:
                    "status is required"
            });
        }

        try {
            const safeStatus =
                await safeEnumValue(
                    "waitlist",
                    "status",
                    status,
                    null
                );

            const result =
                await queryDb(
                    `UPDATE waitlist
                     SET status = ?
                     WHERE waitlist_id = ?`,
                    [
                        safeStatus,
                        req.params.id
                    ]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Waitlist entry not found"
                });
            }

            res.json({
                message:
                    "Waitlist status updated",
                status:
                    safeStatus
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to update waitlist",
                error
            );
        }
    }
);

app.post(
    "/api/waitlist/:id/promote",
    async (req, res) => {
        try {
            const rows =
                await queryDb(
                    `SELECT
                        w.*,
                        rp.project_title,
                        rp.maximum_team_size
                     FROM waitlist w
                     JOIN research_projects rp
                       ON rp.project_id =
                          w.project_id
                     WHERE
                        w.waitlist_id = ?
                     LIMIT 1`,
                    [req.params.id]
                );

            if (!rows.length) {
                return res.status(
                    404
                ).json({
                    message:
                        "Waitlist entry not found"
                });
            }

            const wait =
                rows[0];

            const teams =
                await queryDb(
                    `SELECT
                        pt.team_id,
                        COUNT(
                            tm.team_member_id
                        ) AS member_count
                     FROM project_teams pt
                     LEFT JOIN team_members tm
                       ON tm.team_id =
                          pt.team_id
                     WHERE
                        pt.project_id = ?
                     AND
                        pt.team_status =
                            'Active'
                     GROUP BY
                        pt.team_id
                     ORDER BY
                        pt.team_id
                     LIMIT 1`,
                    [wait.project_id]
                );

            if (!teams.length) {
                return res.status(
                    400
                ).json({
                    message:
                        "No active team exists for this project"
                });
            }

            const teamId =
                teams[0].team_id;

            if (
                Number(
                    teams[0]
                        .member_count
                ) >=
                Number(
                    wait.maximum_team_size
                )
            ) {
                return res.status(
                    400
                ).json({
                    message:
                        "The active team is already full"
                });
            }

            const memberRole =
                await safeEnumValue(
                    "team_members",
                    "member_role",
                    "Member",
                    null
                );

            await queryDb(
                `INSERT INTO team_members
                (
                    team_id,
                    student_id,
                    member_role
                )
                VALUES (?, ?, ?)`,
                [
                    teamId,
                    wait.student_id,
                    memberRole
                ]
            );

            const promotedStatus =
                await safeEnumValue(
                    "waitlist",
                    "status",
                    "Promoted",
                    null
                );

            await queryDb(
                `UPDATE waitlist
                 SET status = ?
                 WHERE waitlist_id = ?`,
                [
                    promotedStatus,
                    req.params.id
                ]
            );

            const acceptedStatus =
                await safeEnumValue(
                    "project_applications",
                    "status",
                    "Accepted",
                    null
                );

            await queryDb(
                `UPDATE project_applications
                 SET
                    status = ?,
                    remarks = ?
                 WHERE
                    project_id = ?
                 AND
                    student_id = ?`,
                [
                    acceptedStatus,
                    "Promoted from waitlist",
                    wait.project_id,
                    wait.student_id
                ]
            );

            await notifyStudentById(
                wait.student_id,
                "Waitlist Promotion",
                `You have been promoted from the waitlist into a team for "${wait.project_title}".`,
                "Team"
            );

            res.json({
                message:
                    "Student promoted successfully",
                team_id:
                    teamId
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to promote waitlisted student",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// TEAMS
// ------------------------------------------------------------

app.get(
    "/api/teams",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        pt.*,
                        rp.project_title,
                        COUNT(
                            tm.team_member_id
                        ) AS member_count
                     FROM project_teams pt
                     JOIN research_projects rp
                       ON rp.project_id =
                          pt.project_id
                     LEFT JOIN team_members tm
                       ON tm.team_id =
                          pt.team_id
                     GROUP BY
                        pt.team_id
                     ORDER BY
                        pt.created_at DESC`
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch teams",
                error
            );
        }
    }
);

app.get(
    "/api/teams/:id",
    async (req, res) => {
        try {
            const team =
                await getTeam(
                    req.params.id
                );

            if (!team) {
                return res.status(
                    404
                ).json({
                    message:
                        "Team not found"
                });
            }

            const members =
                await queryDb(
                    `SELECT
                        tm.*,
                        s.register_number,
                        s.cgpa,
                        u.full_name,
                        u.email
                     FROM team_members tm
                     JOIN students s
                       ON s.student_id =
                          tm.student_id
                     JOIN users u
                       ON u.user_id =
                          s.user_id
                     WHERE
                        tm.team_id = ?
                     ORDER BY
                        tm.joined_at`,
                    [req.params.id]
                );

            res.json({
                ...team,
                members
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch team",
                error
            );
        }
    }
);

app.post(
    "/api/teams",
    async (req, res) => {
        const {
            project_id,
            team_name,
            formation_type,
            team_status
        } = req.body;

        if (
            !project_id ||
            !team_name
        ) {
            return res.status(
                400
            ).json({
                message:
                    "project_id and team_name are required"
            });
        }

        try {
            const safeFormation =
                await safeEnumValue(
                    "project_teams",
                    "formation_type",
                    formation_type ||
                        "Manual",
                    null
                );

            const safeStatus =
                await safeEnumValue(
                    "project_teams",
                    "team_status",
                    team_status ||
                        "Active",
                    null
                );

            const result =
                await queryDb(
                    `INSERT INTO project_teams
                    (
                        project_id,
                        team_name,
                        formation_type,
                        team_status
                    )
                    VALUES (?, ?, ?, ?)`,
                    [
                        project_id,
                        team_name,
                        safeFormation,
                        safeStatus
                    ]
                );

            res.status(201).json({
                message:
                    "Team created",
                team_id:
                    result.insertId
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to create team",
                error
            );
        }
    }
);

app.put(
    "/api/teams/:id",
    async (req, res) => {
        const {
            team_name,
            formation_type,
            team_status
        } = req.body;

        try {
            const safeFormation =
                formation_type
                    ? await safeEnumValue(
                          "project_teams",
                          "formation_type",
                          formation_type,
                          null
                      )
                    : null;

            const safeStatus =
                team_status
                    ? await safeEnumValue(
                          "project_teams",
                          "team_status",
                          team_status,
                          null
                      )
                    : null;

            const result =
                await queryDb(
                    `UPDATE project_teams SET
                        team_name =
                            COALESCE(
                                ?,
                                team_name
                            ),
                        formation_type =
                            COALESCE(
                                ?,
                                formation_type
                            ),
                        team_status =
                            COALESCE(
                                ?,
                                team_status
                            )
                     WHERE team_id = ?`,
                    [
                        team_name,
                        safeFormation,
                        safeStatus,
                        req.params.id
                    ]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Team not found"
                });
            }

            res.json({
                message:
                    "Team updated"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to update team",
                error
            );
        }
    }
);

app.delete(
    "/api/teams/:id",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `DELETE FROM project_teams
                     WHERE team_id = ?`,
                    [req.params.id]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Team not found"
                });
            }

            res.json({
                message:
                    "Team deleted"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to delete team",
                error
            );
        }
    }
);

app.post(
    "/api/teams/:id/members",
    async (req, res) => {
        const {
            student_id,
            member_role
        } = req.body;

        if (!student_id) {
            return res.status(
                400
            ).json({
                message:
                    "student_id is required"
            });
        }

        try {
            const team =
                await getTeam(
                    req.params.id
                );

            if (!team) {
                return res.status(
                    404
                ).json({
                    message:
                        "Team not found"
                });
            }

            const project =
                await getProject(
                    team.project_id
                );

            const current =
                await queryDb(
                    `SELECT COUNT(*) AS count
                     FROM team_members
                     WHERE team_id = ?`,
                    [req.params.id]
                );

            if (
                Number(
                    current[0].count
                ) >=
                Number(
                    project?.maximum_team_size ||
                        999
                )
            ) {
                return res.status(
                    400
                ).json({
                    message:
                        "Team has reached its maximum size"
                });
            }

            const duplicate =
                await queryDb(
                    `SELECT
                        team_member_id
                     FROM team_members
                     WHERE
                        team_id = ?
                     AND
                        student_id = ?
                     LIMIT 1`,
                    [
                        req.params.id,
                        student_id
                    ]
                );

            if (duplicate.length) {
                return res.status(
                    409
                ).json({
                    message:
                        "Student is already in this team"
                });
            }

            const role =
                await safeEnumValue(
                    "team_members",
                    "member_role",
                    member_role ||
                        "Member",
                    null
                );

            const result =
                await queryDb(
                    `INSERT INTO team_members
                    (
                        team_id,
                        student_id,
                        member_role
                    )
                    VALUES (?, ?, ?)`,
                    [
                        req.params.id,
                        student_id,
                        role
                    ]
                );

            res.status(201).json({
                message:
                    "Team member added",
                team_member_id:
                    result.insertId
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to add team member",
                error
            );
        }
    }
);

app.put(
    "/api/teams/:id/members/:studentId",
    async (req, res) => {
        const {
            member_role
        } = req.body;

        try {
            const role =
                await safeEnumValue(
                    "team_members",
                    "member_role",
                    member_role,
                    null
                );

            const result =
                await queryDb(
                    `UPDATE team_members
                     SET member_role = ?
                     WHERE
                        team_id = ?
                     AND
                        student_id = ?`,
                    [
                        role,
                        req.params.id,
                        req.params.studentId
                    ]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Team member not found"
                });
            }

            res.json({
                message:
                    "Team member role updated"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to update team member",
                error
            );
        }
    }
);

app.delete(
    "/api/teams/:id/members/:studentId",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `DELETE FROM team_members
                     WHERE
                        team_id = ?
                     AND
                        student_id = ?`,
                    [
                        req.params.id,
                        req.params.studentId
                    ]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Team member not found"
                });
            }

            res.json({
                message:
                    "Team member removed"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to remove team member",
                error
            );
        }
    }
);

app.get(
    "/api/students/:studentId/teams",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        pt.*,
                        tm.member_role,
                        rp.project_title
                     FROM team_members tm
                     JOIN project_teams pt
                       ON pt.team_id =
                          tm.team_id
                     JOIN research_projects rp
                       ON rp.project_id =
                          pt.project_id
                     WHERE
                        tm.student_id = ?
                     ORDER BY
                        pt.team_id DESC`,
                    [req.params.studentId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch student teams",
                error
            );
        }
    }
);

// SMART TEAM FORMATION
app.post(
    "/api/teams/smart-form/:projectId",
    async (req, res) => {
        const projectId =
            Number(
                req.params.projectId
            );

        const {
            team_name
        } = req.body;

        try {
            const project =
                await getProject(
                    projectId
                );

            if (!project) {
                return res.status(
                    404
                ).json({
                    message:
                        "Project not found"
                });
            }

            const applicants =
                await queryDb(
                    `SELECT DISTINCT
                        student_id
                     FROM project_applications
                     WHERE
                        project_id = ?
                     AND
                        status NOT IN
                        ('Rejected')`,
                    [projectId]
                );

            if (!applicants.length) {
                return res.status(
                    400
                ).json({
                    message:
                        "No applicants available for smart team formation"
                });
            }

            const scored = [];

            for (
                const applicant of
                applicants
            ) {
                scored.push(
                    await calculateCompatibility(
                        applicant.student_id,
                        projectId
                    )
                );
            }

            scored.sort(
                (a, b) =>
                    Number(
                        b.eligible
                    ) -
                        Number(
                            a.eligible
                        ) ||
                    b.total_score -
                        a.total_score
            );

            const maxTeamSize =
                Math.max(
                    1,
                    Number(
                        project.maximum_team_size ||
                            1
                    )
                );

            const selected =
                scored
                    .filter(
                        (student) =>
                            student.eligible
                    )
                    .slice(
                        0,
                        maxTeamSize
                    );

            const waiting =
                scored.filter(
                    (student) =>
                        !selected.some(
                            (s) =>
                                s.student_id ===
                                student.student_id
                        )
                );

            if (!selected.length) {
                return res.status(
                    400
                ).json({
                    message:
                        "No eligible applicants are available for smart team formation"
                });
            }

            const formationType =
                await safeEnumValue(
                    "project_teams",
                    "formation_type",
                    "Smart",
                    null
                );

            const teamStatus =
                await safeEnumValue(
                    "project_teams",
                    "team_status",
                    "Active",
                    null
                );

            const teamResult =
                await queryDb(
                    `INSERT INTO project_teams
                    (
                        project_id,
                        team_name,
                        formation_type,
                        team_status
                    )
                    VALUES (?, ?, ?, ?)`,
                    [
                        projectId,
                        team_name ||
                            `${project.project_title} Team`,
                        formationType,
                        teamStatus
                    ]
                );

            const teamId =
                teamResult.insertId;

            const acceptedStatus =
                await safeEnumValue(
                    "project_applications",
                    "status",
                    "Accepted",
                    null
                );

            const waitlistedStatus =
                await safeEnumValue(
                    "project_applications",
                    "status",
                    "Waitlisted",
                    null
                );

            const waitingStatus =
                await safeEnumValue(
                    "waitlist",
                    "status",
                    "Waiting",
                    null
                );

            const leaderRole =
                await safeEnumValue(
                    "team_members",
                    "member_role",
                    "Leader",
                    null
                );

            const memberRole =
                await safeEnumValue(
                    "team_members",
                    "member_role",
                    "Member",
                    null
                );

            for (
                let i = 0;
                i <
                selected.length;
                i++
            ) {
                const student =
                    selected[i];

                await queryDb(
                    `INSERT INTO team_members
                    (
                        team_id,
                        student_id,
                        member_role
                    )
                    VALUES (?, ?, ?)`,
                    [
                        teamId,
                        student.student_id,
                        i === 0
                            ? leaderRole
                            : memberRole
                    ]
                );

                await queryDb(
                    `UPDATE project_applications
                     SET
                        status = ?,
                        remarks = ?
                     WHERE
                        project_id = ?
                     AND
                        student_id = ?`,
                    [
                        acceptedStatus,
                        `Selected by smart team formation (${student.total_score}%)`,
                        projectId,
                        student.student_id
                    ]
                );

                await notifyStudentById(
                    student.student_id,
                    "Team Selection",
                    `You were selected for the project team "${project.project_title}".`,
                    "Team"
                );
            }

            let position = 1;

            for (
                const student of
                waiting
            ) {
                const existing =
                    await queryDb(
                        `SELECT
                            waitlist_id
                         FROM waitlist
                         WHERE
                            student_id = ?
                         AND
                            project_id = ?
                         LIMIT 1`,
                        [
                            student.student_id,
                            projectId
                        ]
                    );

                if (!existing.length) {
                    await queryDb(
                        `INSERT INTO waitlist
                        (
                            student_id,
                            project_id,
                            waitlist_position,
                            status
                        )
                        VALUES (?, ?, ?, ?)`,
                        [
                            student.student_id,
                            projectId,
                            position++,
                            waitingStatus
                        ]
                    );
                }

                await queryDb(
                    `UPDATE project_applications
                     SET
                        status = ?,
                        remarks = ?
                     WHERE
                        project_id = ?
                     AND
                        student_id = ?`,
                    [
                        waitlistedStatus,
                        `Placed on waitlist (${student.total_score}%)`,
                        projectId,
                        student.student_id
                    ]
                );
            }

            res.status(201).json({
                message:
                    "Smart team formed successfully",
                team_id:
                    teamId,
                selected,
                waitlisted:
                    waiting
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to form smart team",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// MILESTONES
// ------------------------------------------------------------

app.get(
    "/api/milestones",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        m.*,
                        rp.project_title
                     FROM milestones m
                     JOIN research_projects rp
                       ON rp.project_id =
                          m.project_id
                     ORDER BY
                        m.due_date,
                        m.milestone_id`
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch milestones",
                error
            );
        }
    }
);

app.post(
    "/api/milestones",
    async (req, res) => {
        const {
            project_id,
            milestone_title,
            milestone_description,
            due_date
        } = req.body;

        if (
            !project_id ||
            !milestone_title ||
            !due_date
        ) {
            return res.status(
                400
            ).json({
                message:
                    "project_id, milestone_title and due_date are required"
            });
        }

        try {
            const result =
                await queryDb(
                    `INSERT INTO milestones
                    (
                        project_id,
                        milestone_title,
                        milestone_description,
                        due_date
                    )
                    VALUES (?, ?, ?, ?)`,
                    [
                        project_id,
                        milestone_title,
                        milestone_description ||
                            null,
                        due_date
                    ]
                );

            res.status(201).json({
                message:
                    "Milestone created",
                milestone_id:
                    result.insertId
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to create milestone",
                error
            );
        }
    }
);

app.get(
    "/api/milestones/project/:projectId",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT *
                     FROM milestones
                     WHERE project_id = ?
                     ORDER BY
                        due_date,
                        milestone_id`,
                    [req.params.projectId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch project milestones",
                error
            );
        }
    }
);

app.get(
    "/api/milestones/:id",
    async (req, res) => {
        try {
            const rows =
                await queryDb(
                    `SELECT *
                     FROM milestones
                     WHERE milestone_id = ?
                     LIMIT 1`,
                    [req.params.id]
                );

            if (!rows.length) {
                return res.status(
                    404
                ).json({
                    message:
                        "Milestone not found"
                });
            }

            res.json(rows[0]);
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch milestone",
                error
            );
        }
    }
);

app.put(
    "/api/milestones/:id",
    async (req, res) => {
        const {
            milestone_title,
            milestone_description,
            due_date,
            status,
            completion_percentage
        } = req.body;

        try {
            const safeStatus =
                status
                    ? await safeEnumValue(
                          "milestones",
                          "status",
                          status,
                          null
                      )
                    : null;

            const result =
                await queryDb(
                    `UPDATE milestones SET
                        milestone_title =
                            COALESCE(
                                ?,
                                milestone_title
                            ),
                        milestone_description =
                            COALESCE(
                                ?,
                                milestone_description
                            ),
                        due_date =
                            COALESCE(
                                ?,
                                due_date
                            ),
                        status =
                            COALESCE(
                                ?,
                                status
                            ),
                        completion_percentage =
                            COALESCE(
                                ?,
                                completion_percentage
                            )
                     WHERE milestone_id = ?`,
                    [
                        milestone_title,
                        milestone_description,
                        due_date,
                        safeStatus,
                        completion_percentage,
                        req.params.id
                    ]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Milestone not found"
                });
            }

            res.json({
                message:
                    "Milestone updated"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to update milestone",
                error
            );
        }
    }
);

app.delete(
    "/api/milestones/:id",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `DELETE FROM milestones
                     WHERE milestone_id = ?`,
                    [req.params.id]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Milestone not found"
                });
            }

            res.json({
                message:
                    "Milestone deleted"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to delete milestone",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// TASKS
// ------------------------------------------------------------

app.get(
    "/api/tasks",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        t.*,
                        m.milestone_title,
                        m.project_id,
                        rp.project_title,
                        pt.team_name,
                        s.register_number,
                        u.full_name AS student_name
                     FROM tasks t
                     JOIN milestones m
                       ON m.milestone_id =
                          t.milestone_id
                     JOIN research_projects rp
                       ON rp.project_id =
                          m.project_id
                     LEFT JOIN project_teams pt
                       ON pt.team_id =
                          t.team_id
                     LEFT JOIN students s
                       ON s.student_id =
                          t.assigned_to
                     LEFT JOIN users u
                       ON u.user_id =
                          s.user_id
                     ORDER BY
                        t.due_date,
                        t.task_id`
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch tasks",
                error
            );
        }
    }
);

app.post(
    "/api/tasks",
    async (req, res) => {
        const {
            milestone_id,
            team_id,
            task_title,
            task_description,
            assigned_to,
            priority,
            due_date
        } = req.body;

        if (
            !milestone_id ||
            !task_title
        ) {
            return res.status(
                400
            ).json({
                message:
                    "milestone_id and task_title are required"
            });
        }

        try {
            const safePriority =
                await safeEnumValue(
                    "tasks",
                    "priority",
                    priority ||
                        "Medium",
                    null
                );

            const safeStatus =
                await safeEnumValue(
                    "tasks",
                    "status",
                    "Not Started",
                    null
                );

            const result =
                await queryDb(
                    `INSERT INTO tasks
                    (
                        milestone_id,
                        team_id,
                        task_title,
                        task_description,
                        assigned_to,
                        priority,
                        due_date,
                        status,
                        completion_percentage
                    )
                    VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                    [
                        milestone_id,
                        team_id ||
                            null,
                        task_title,
                        task_description ||
                            null,
                        assigned_to ||
                            null,
                        safePriority,
                        due_date ||
                            null,
                        safeStatus
                    ]
                );

            res.status(201).json({
                message:
                    "Task created",
                task_id:
                    result.insertId
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to create task",
                error
            );
        }
    }
);

app.get(
    "/api/tasks/team/:teamId",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        t.*,
                        m.milestone_title,
                        m.project_id,
                        rp.project_title
                     FROM tasks t
                     JOIN milestones m
                       ON m.milestone_id =
                          t.milestone_id
                     JOIN research_projects rp
                       ON rp.project_id =
                          m.project_id
                     WHERE
                        t.team_id = ?
                     ORDER BY
                        t.due_date,
                        t.task_id`,
                    [req.params.teamId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch team tasks",
                error
            );
        }
    }
);

app.get(
    "/api/students/:studentId/tasks",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        t.*,
                        m.milestone_title,
                        m.project_id,
                        rp.project_title,
                        pt.team_name
                     FROM tasks t
                     JOIN milestones m
                       ON m.milestone_id =
                          t.milestone_id
                     JOIN research_projects rp
                       ON rp.project_id =
                          m.project_id
                     LEFT JOIN project_teams pt
                       ON pt.team_id =
                          t.team_id
                     WHERE
                        t.assigned_to = ?
                     ORDER BY
                        t.due_date,
                        t.task_id`,
                    [req.params.studentId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch student tasks",
                error
            );
        }
    }
);

app.get(
    "/api/tasks/:id",
    async (req, res) => {
        try {
            const rows =
                await queryDb(
                    `SELECT *
                     FROM tasks
                     WHERE task_id = ?
                     LIMIT 1`,
                    [req.params.id]
                );

            if (!rows.length) {
                return res.status(
                    404
                ).json({
                    message:
                        "Task not found"
                });
            }

            res.json(rows[0]);
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch task",
                error
            );
        }
    }
);

app.put(
    "/api/tasks/:id",
    async (req, res) => {
        const {
            task_title,
            task_description,
            assigned_to,
            priority,
            due_date,
            status,
            completion_percentage
        } = req.body;

        try {
            const safePriority =
                priority
                    ? await safeEnumValue(
                          "tasks",
                          "priority",
                          priority,
                          null
                      )
                    : null;

            const safeStatus =
                status
                    ? await safeEnumValue(
                          "tasks",
                          "status",
                          status,
                          null
                      )
                    : null;

            const pct =
                completion_percentage ===
                undefined
                    ? null
                    : clamp(
                          completion_percentage,
                          0,
                          100
                      );

            const result =
                await queryDb(
                    `UPDATE tasks SET
                        task_title =
                            COALESCE(
                                ?,
                                task_title
                            ),
                        task_description =
                            COALESCE(
                                ?,
                                task_description
                            ),
                        assigned_to =
                            COALESCE(
                                ?,
                                assigned_to
                            ),
                        priority =
                            COALESCE(
                                ?,
                                priority
                            ),
                        due_date =
                            COALESCE(
                                ?,
                                due_date
                            ),
                        status =
                            COALESCE(
                                ?,
                                status
                            ),
                        completion_percentage =
                            COALESCE(
                                ?,
                                completion_percentage
                            )
                     WHERE
                        task_id = ?`,
                    [
                        task_title,
                        task_description,
                        assigned_to,
                        safePriority,
                        due_date,
                        safeStatus,
                        pct,
                        req.params.id
                    ]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Task not found"
                });
            }

            res.json({
                message:
                    "Task updated"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to update task",
                error
            );
        }
    }
);

app.delete(
    "/api/tasks/:id",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `DELETE FROM tasks
                     WHERE task_id = ?`,
                    [req.params.id]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Task not found"
                });
            }

            res.json({
                message:
                    "Task deleted"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to delete task",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// PROGRESS
// ------------------------------------------------------------

async function saveProgressUpdate(
    taskId,
    studentId,
    percentage,
    description
) {
    const pct =
        clamp(
            percentage,
            0,
            100
        );

    const result =
        await queryDb(
            `INSERT INTO progress_updates
            (
                task_id,
                student_id,
                progress_percentage,
                update_description
            )
            VALUES (?, ?, ?, ?)`,
            [
                taskId,
                studentId,
                pct,
                description ||
                    null
            ]
        );

    await queryDb(
        `UPDATE tasks
         SET completion_percentage = ?
         WHERE task_id = ?`,
        [
            pct,
            taskId
        ]
    );

    if (pct >= 100) {
        const completed =
            await safeEnumValue(
                "tasks",
                "status",
                "Completed",
                null
            );

        if (completed) {
            await queryDb(
                `UPDATE tasks
                 SET status = ?
                 WHERE task_id = ?`,
                [
                    completed,
                    taskId
                ]
            );
        }
    }

    return result.insertId;
}

app.post(
    "/api/progress-updates",
    async (req, res) => {
        const {
            task_id,
            student_id,
            progress_percentage,
            update_description
        } = req.body;

        if (
            !task_id ||
            !student_id ||
            progress_percentage ===
                undefined
        ) {
            return res.status(
                400
            ).json({
                message:
                    "task_id, student_id and progress_percentage are required"
            });
        }

        try {
            const id =
                await saveProgressUpdate(
                    task_id,
                    student_id,
                    progress_percentage,
                    update_description
                );

            res.status(201).json({
                message:
                    "Progress update submitted",
                progress_update_id:
                    id
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to submit progress update",
                error
            );
        }
    }
);

app.post(
    "/api/progress",
    async (req, res) => {
        const {
            task_id,
            student_id,
            progress_percentage,
            update_description
        } = req.body;

        if (
            !task_id ||
            !student_id ||
            progress_percentage ===
                undefined
        ) {
            return res.status(
                400
            ).json({
                message:
                    "task_id, student_id and progress_percentage are required"
            });
        }

        try {
            const id =
                await saveProgressUpdate(
                    task_id,
                    student_id,
                    progress_percentage,
                    update_description
                );

            res.status(201).json({
                message:
                    "Progress update submitted",
                progress_update_id:
                    id
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to submit progress update",
                error
            );
        }
    }
);

app.get(
    "/api/tasks/:taskId/progress",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        pu.*,
                        s.register_number,
                        u.full_name AS student_name
                     FROM progress_updates pu
                     JOIN students s
                       ON s.student_id =
                          pu.student_id
                     JOIN users u
                       ON u.user_id =
                          s.user_id
                     WHERE
                        pu.task_id = ?
                     ORDER BY
                        pu.submitted_at DESC`,
                    [req.params.taskId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch task progress",
                error
            );
        }
    }
);

app.get(
    "/api/progress/project/:projectId",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        t.task_id,
                        t.task_title,
                        t.status,
                        t.completion_percentage,
                        m.milestone_id,
                        m.milestone_title,
                        pt.team_id,
                        pt.team_name,
                        COALESCE(
                            MAX(
                                pu.progress_percentage
                            ),
                            t.completion_percentage,
                            0
                        ) AS latest_progress
                     FROM milestones m
                     JOIN tasks t
                       ON t.milestone_id =
                          m.milestone_id
                     LEFT JOIN project_teams pt
                       ON pt.team_id =
                          t.team_id
                     LEFT JOIN progress_updates pu
                       ON pu.task_id =
                          t.task_id
                     WHERE
                        m.project_id = ?
                     GROUP BY
                        t.task_id,
                        t.task_title,
                        t.status,
                        t.completion_percentage,
                        m.milestone_id,
                        m.milestone_title,
                        pt.team_id,
                        pt.team_name
                     ORDER BY
                        m.milestone_id,
                        t.task_id`,
                    [req.params.projectId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch project progress",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// RESOURCES
// ------------------------------------------------------------

app.get(
    "/api/resources",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT *
                     FROM resources
                     ORDER BY resource_name`
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch resources",
                error
            );
        }
    }
);

app.post(
    "/api/resources",
    async (req, res) => {
        const {
            resource_name,
            resource_type,
            total_quantity,
            description
        } = req.body;

        if (
            !resource_name ||
            !resource_type ||
            total_quantity ===
                undefined
        ) {
            return res.status(
                400
            ).json({
                message:
                    "resource_name, resource_type and total_quantity are required"
            });
        }

        const total =
            Math.max(
                0,
                Number(
                    total_quantity
                )
            );

        try {
            const result =
                await queryDb(
                    `INSERT INTO resources
                    (
                        resource_name,
                        resource_type,
                        total_quantity,
                        available_quantity,
                        description
                    )
                    VALUES (?, ?, ?, ?, ?)`,
                    [
                        resource_name,
                        resource_type,
                        total,
                        total,
                        description ||
                            null
                    ]
                );

            res.status(201).json({
                message:
                    "Resource created",
                resource_id:
                    result.insertId
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to create resource",
                error
            );
        }
    }
);

app.put(
    "/api/resources/:id",
    async (req, res) => {
        const {
            resource_name,
            resource_type,
            total_quantity,
            available_quantity,
            description
        } = req.body;

        try {
            const result =
                await queryDb(
                    `UPDATE resources SET
                        resource_name =
                            COALESCE(
                                ?,
                                resource_name
                            ),
                        resource_type =
                            COALESCE(
                                ?,
                                resource_type
                            ),
                        total_quantity =
                            COALESCE(
                                ?,
                                total_quantity
                            ),
                        available_quantity =
                            COALESCE(
                                ?,
                                available_quantity
                            ),
                        description =
                            COALESCE(
                                ?,
                                description
                            )
                     WHERE resource_id = ?`,
                    [
                        resource_name,
                        resource_type,
                        total_quantity,
                        available_quantity,
                        description,
                        req.params.id
                    ]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Resource not found"
                });
            }

            res.json({
                message:
                    "Resource updated"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to update resource",
                error
            );
        }
    }
);

app.delete(
    "/api/resources/:id",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `DELETE FROM resources
                     WHERE resource_id = ?`,
                    [req.params.id]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Resource not found"
                });
            }

            res.json({
                message:
                    "Resource deleted"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to delete resource",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// RESOURCE REQUESTS
// ------------------------------------------------------------

app.get(
    "/api/resource-requests",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        rr.*,
                        r.resource_name,
                        r.resource_type,
                        r.available_quantity,
                        rp.project_title,
                        pt.team_name
                     FROM resource_requests rr
                     JOIN resources r
                       ON r.resource_id =
                          rr.resource_id
                     JOIN research_projects rp
                       ON rp.project_id =
                          rr.project_id
                     LEFT JOIN project_teams pt
                       ON pt.team_id =
                          rr.team_id
                     ORDER BY
                        rr.request_date DESC`
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch resource requests",
                error
            );
        }
    }
);

app.post(
    "/api/resource-requests",
    async (req, res) => {
        const {
            project_id,
            team_id,
            resource_id,
            requested_quantity,
            required_from,
            required_until,
            purpose
        } = req.body;

        if (
            !project_id ||
            !team_id ||
            !resource_id ||
            !requested_quantity
        ) {
            return res.status(
                400
            ).json({
                message:
                    "project_id, team_id, resource_id and requested_quantity are required"
            });
        }

        try {
            const safeStatus =
                await safeEnumValue(
                    "resource_requests",
                    "status",
                    "Pending",
                    null
                );

            const result =
                await queryDb(
                    `INSERT INTO resource_requests
                    (
                        project_id,
                        team_id,
                        resource_id,
                        requested_quantity,
                        required_from,
                        required_until,
                        purpose,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        project_id,
                        team_id,
                        resource_id,
                        requested_quantity,
                        required_from ||
                            null,
                        required_until ||
                            null,
                        purpose ||
                            null,
                        safeStatus
                    ]
                );

            res.status(201).json({
                message:
                    "Resource request submitted",
                request_id:
                    result.insertId,
                status:
                    safeStatus
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to submit resource request",
                error
            );
        }
    }
);

app.put(
    "/api/resource-requests/:id",
    async (req, res) => {
        const {
            status
        } = req.body;

        try {
            const safeStatus =
                await safeEnumValue(
                    "resource_requests",
                    "status",
                    status,
                    null
                );

            const result =
                await queryDb(
                    `UPDATE resource_requests
                     SET status = ?
                     WHERE request_id = ?`,
                    [
                        safeStatus,
                        req.params.id
                    ]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Resource request not found"
                });
            }

            res.json({
                message:
                    "Resource request updated",
                status:
                    safeStatus
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to update resource request",
                error
            );
        }
    }
);

app.delete(
    "/api/resource-requests/:id",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `DELETE FROM resource_requests
                     WHERE request_id = ?`,
                    [req.params.id]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Resource request not found"
                });
            }

            res.json({
                message:
                    "Resource request deleted"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to delete resource request",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// RESOURCE ALLOCATIONS
// ------------------------------------------------------------

app.get(
    "/api/resource-allocations",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        ra.*,
                        rr.project_id,
                        rr.team_id,
                        rr.resource_id,
                        r.resource_name,
                        u.full_name AS allocated_by_name
                     FROM resource_allocations ra
                     JOIN resource_requests rr
                       ON rr.request_id =
                          ra.request_id
                     JOIN resources r
                       ON r.resource_id =
                          rr.resource_id
                     LEFT JOIN users u
                       ON u.user_id =
                          ra.allocated_by
                     ORDER BY
                        ra.allocated_at DESC`
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch resource allocations",
                error
            );
        }
    }
);

app.post(
    "/api/resource-allocations",
    async (req, res) => {
        const {
            request_id,
            allocated_quantity,
            allocated_by,
            allocated_from,
            allocated_until,
            remarks
        } = req.body;

        if (
            !request_id ||
            !allocated_quantity ||
            !allocated_by
        ) {
            return res.status(
                400
            ).json({
                message:
                    "request_id, allocated_quantity and allocated_by are required"
            });
        }

        try {
            const requests =
                await queryDb(
                    `SELECT
                        rr.*,
                        r.available_quantity
                     FROM resource_requests rr
                     JOIN resources r
                       ON r.resource_id =
                          rr.resource_id
                     WHERE
                        rr.request_id = ?
                     LIMIT 1`,
                    [request_id]
                );

            if (!requests.length) {
                return res.status(
                    404
                ).json({
                    message:
                        "Resource request not found"
                });
            }

            const request =
                requests[0];

            if (
                Number(
                    allocated_quantity
                ) <= 0
            ) {
                return res.status(
                    400
                ).json({
                    message:
                        "allocated_quantity must be positive"
                });
            }

            if (
                Number(
                    allocated_quantity
                ) >
                Number(
                    request.available_quantity
                )
            ) {
                return res.status(
                    400
                ).json({
                    message:
                        "Not enough resource quantity available"
                });
            }

            const result =
                await queryDb(
                    `INSERT INTO resource_allocations
                    (
                        request_id,
                        allocated_quantity,
                        allocated_by,
                        allocated_from,
                        allocated_until,
                        remarks
                    )
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        request_id,
                        allocated_quantity,
                        allocated_by,
                        allocated_from ||
                            null,
                        allocated_until ||
                            null,
                        remarks ||
                            null
                    ]
                );

            await queryDb(
                `UPDATE resources
                 SET
                    available_quantity =
                        available_quantity - ?
                 WHERE
                    resource_id = ?`,
                [
                    allocated_quantity,
                    request.resource_id
                ]
            );

            const allocatedStatus =
                await safeEnumValue(
                    "resource_requests",
                    "status",
                    "Allocated",
                    null
                );

            await queryDb(
                `UPDATE resource_requests
                 SET status = ?
                 WHERE request_id = ?`,
                [
                    allocatedStatus,
                    request_id
                ]
            );

            res.status(201).json({
                message:
                    "Resource allocated",
                allocation_id:
                    result.insertId
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to allocate resource",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// ISSUES
// ------------------------------------------------------------

app.get(
    "/api/issues",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        i.*,
                        rp.project_title,
                        u.full_name AS reporter_name
                     FROM issues i
                     JOIN research_projects rp
                       ON rp.project_id =
                          i.project_id
                     LEFT JOIN users u
                       ON u.user_id =
                          i.reported_by
                     ORDER BY
                        i.reported_at DESC`
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch issues",
                error
            );
        }
    }
);

app.post(
    "/api/issues",
    async (req, res) => {
        const {
            project_id,
            reported_by,
            issue_title,
            issue_description,
            issue_category,
            severity,
            status
        } = req.body;

        if (
            !project_id ||
            !issue_title ||
            !issue_description
        ) {
            return res.status(
                400
            ).json({
                message:
                    "project_id, issue_title and issue_description are required"
            });
        }

        try {
            // Dynamic enum lookup avoids the issue_category
            // mismatch that caused one of our earlier failures.
            const category =
                await safeEnumValue(
                    "issues",
                    "issue_category",
                    issue_category ||
                        null,
                    null
                );

            const safeSeverity =
                await safeEnumValue(
                    "issues",
                    "severity",
                    severity ||
                        "Medium",
                    null
                );

            const safeStatus =
                await safeEnumValue(
                    "issues",
                    "status",
                    status ||
                        "Open",
                    null
                );

            const result =
                await queryDb(
                    `INSERT INTO issues
                    (
                        project_id,
                        reported_by,
                        issue_title,
                        issue_description,
                        issue_category,
                        severity,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        project_id,
                        reported_by ||
                            null,
                        issue_title,
                        issue_description,
                        category,
                        safeSeverity,
                        safeStatus
                    ]
                );

            res.status(201).json({
                message:
                    "Issue reported successfully",
                issue_id:
                    result.insertId
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to report issue",
                error
            );
        }
    }
);

app.get(
    "/api/issues/project/:projectId",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT *
                     FROM issues
                     WHERE project_id = ?
                     ORDER BY
                        reported_at DESC`,
                    [req.params.projectId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch project issues",
                error
            );
        }
    }
);

app.put(
    "/api/issues/:id",
    async (req, res) => {
        const {
            issue_title,
            issue_description,
            issue_category,
            severity,
            status
        } = req.body;

        try {
            const category =
                issue_category
                    ? await safeEnumValue(
                          "issues",
                          "issue_category",
                          issue_category,
                          null
                      )
                    : null;

            const safeSeverity =
                severity
                    ? await safeEnumValue(
                          "issues",
                          "severity",
                          severity,
                          null
                      )
                    : null;

            const safeStatus =
                status
                    ? await safeEnumValue(
                          "issues",
                          "status",
                          status,
                          null
                      )
                    : null;

            const result =
                await queryDb(
                    `UPDATE issues SET
                        issue_title =
                            COALESCE(
                                ?,
                                issue_title
                            ),
                        issue_description =
                            COALESCE(
                                ?,
                                issue_description
                            ),
                        issue_category =
                            COALESCE(
                                ?,
                                issue_category
                            ),
                        severity =
                            COALESCE(
                                ?,
                                severity
                            ),
                        status =
                            COALESCE(
                                ?,
                                status
                            ),
                        resolved_at =
                            CASE
                                WHEN ?
                                    IN
                                    (
                                        'Resolved',
                                        'Closed'
                                    )
                                THEN
                                    CURRENT_TIMESTAMP
                                ELSE
                                    resolved_at
                            END
                     WHERE issue_id = ?`,
                    [
                        issue_title,
                        issue_description,
                        category,
                        safeSeverity,
                        safeStatus,
                        status ||
                            null,
                        req.params.id
                    ]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Issue not found"
                });
            }

            res.json({
                message:
                    "Issue updated"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to update issue",
                error
            );
        }
    }
);

app.delete(
    "/api/issues/:id",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `DELETE FROM issues
                     WHERE issue_id = ?`,
                    [req.params.id]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Issue not found"
                });
            }

            res.json({
                message:
                    "Issue deleted"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to delete issue",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// RISKS
// ------------------------------------------------------------

app.get(
    "/api/risks",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        r.*,
                        rp.project_title
                     FROM risks r
                     JOIN research_projects rp
                       ON rp.project_id =
                          r.project_id
                     ORDER BY
                        r.identified_at DESC`
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch risks",
                error
            );
        }
    }
);

app.post(
    "/api/risks",
    async (req, res) => {
        const {
            project_id,
            risk_title,
            risk_description,
            probability,
            impact,
            mitigation_plan,
            status
        } = req.body;

        if (
            !project_id ||
            !risk_title
        ) {
            return res.status(
                400
            ).json({
                message:
                    "project_id and risk_title are required"
            });
        }

        try {
            const safeProbability =
                await safeEnumValue(
                    "risks",
                    "probability",
                    probability ||
                        "Medium",
                    null
                );

            const safeImpact =
                await safeEnumValue(
                    "risks",
                    "impact",
                    impact ||
                        "Medium",
                    null
                );

            const safeStatus =
                await safeEnumValue(
                    "risks",
                    "status",
                    status ||
                        "Open",
                    null
                );

            const result =
                await queryDb(
                    `INSERT INTO risks
                    (
                        project_id,
                        risk_title,
                        risk_description,
                        probability,
                        impact,
                        mitigation_plan,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        project_id,
                        risk_title,
                        risk_description ||
                            null,
                        safeProbability,
                        safeImpact,
                        mitigation_plan ||
                            null,
                        safeStatus
                    ]
                );

            res.status(201).json({
                message:
                    "Risk added",
                risk_id:
                    result.insertId
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to add risk",
                error
            );
        }
    }
);

app.get(
    "/api/risks/project/:projectId",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT *
                     FROM risks
                     WHERE project_id = ?
                     ORDER BY
                        identified_at DESC`,
                    [req.params.projectId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch project risks",
                error
            );
        }
    }
);

app.put(
    "/api/risks/:id",
    async (req, res) => {
        const {
            risk_title,
            risk_description,
            probability,
            impact,
            mitigation_plan,
            status
        } = req.body;

        try {
            const safeProbability =
                probability
                    ? await safeEnumValue(
                          "risks",
                          "probability",
                          probability,
                          null
                      )
                    : null;

            const safeImpact =
                impact
                    ? await safeEnumValue(
                          "risks",
                          "impact",
                          impact,
                          null
                      )
                    : null;

            const safeStatus =
                status
                    ? await safeEnumValue(
                          "risks",
                          "status",
                          status,
                          null
                      )
                    : null;

            const result =
                await queryDb(
                    `UPDATE risks SET
                        risk_title =
                            COALESCE(
                                ?,
                                risk_title
                            ),
                        risk_description =
                            COALESCE(
                                ?,
                                risk_description
                            ),
                        probability =
                            COALESCE(
                                ?,
                                probability
                            ),
                        impact =
                            COALESCE(
                                ?,
                                impact
                            ),
                        mitigation_plan =
                            COALESCE(
                                ?,
                                mitigation_plan
                            ),
                        status =
                            COALESCE(
                                ?,
                                status
                            )
                     WHERE risk_id = ?`,
                    [
                        risk_title,
                        risk_description,
                        safeProbability,
                        safeImpact,
                        mitigation_plan,
                        safeStatus,
                        req.params.id
                    ]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Risk not found"
                });
            }

            res.json({
                message:
                    "Risk updated"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to update risk",
                error
            );
        }
    }
);

app.delete(
    "/api/risks/:id",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `DELETE FROM risks
                     WHERE risk_id = ?`,
                    [req.params.id]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Risk not found"
                });
            }

            res.json({
                message:
                    "Risk deleted"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to delete risk",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// EVALUATIONS
// ------------------------------------------------------------

app.get(
    "/api/evaluations",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        se.*,
                        rp.project_title,
                        u.full_name AS faculty_name,
                        su.full_name AS student_name
                     FROM student_evaluations se
                     JOIN research_projects rp
                       ON rp.project_id =
                          se.project_id
                     LEFT JOIN faculty f
                       ON f.faculty_id =
                          se.faculty_id
                     LEFT JOIN users u
                       ON u.user_id =
                          f.user_id
                     JOIN students s
                       ON s.student_id =
                          se.student_id
                     JOIN users su
                       ON su.user_id =
                          s.user_id
                     ORDER BY
                        se.evaluated_at DESC`
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch evaluations",
                error
            );
        }
    }
);

app.post(
    "/api/evaluations",
    async (req, res) => {
        const {
            student_id,
            project_id,
            faculty_id,
            technical_skills_score,
            contribution_score,
            teamwork_score,
            communication_score,
            feedback
        } = req.body;

        if (
            !student_id ||
            !project_id ||
            !faculty_id
        ) {
            return res.status(
                400
            ).json({
                message:
                    "student_id, project_id and faculty_id are required"
            });
        }

        const scores =
            [
                technical_skills_score,
                contribution_score,
                teamwork_score,
                communication_score
            ].map(
                (x) =>
                    clamp(
                        x,
                        0,
                        10,
                        0
                    )
            );

        const overall =
            Number(
                (
                    scores.reduce(
                        (
                            a,
                            b
                        ) =>
                            a + b,
                        0
                    ) / 4
                ).toFixed(
                    2
                )
            );

        try {
            const result =
                await queryDb(
                    `INSERT INTO student_evaluations
                    (
                        student_id,
                        project_id,
                        faculty_id,
                        technical_skills_score,
                        contribution_score,
                        teamwork_score,
                        communication_score,
                        overall_score,
                        feedback
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        student_id,
                        project_id,
                        faculty_id,
                        scores[0],
                        scores[1],
                        scores[2],
                        scores[3],
                        overall,
                        feedback ||
                            null
                    ]
                );

            await notifyStudentById(
                student_id,
                "Evaluation Available",
                `A faculty evaluation has been submitted for your project. Overall score: ${overall}.`,
                "Evaluation"
            );

            res.status(201).json({
                message:
                    "Evaluation submitted",
                evaluation_id:
                    result.insertId,
                overall_score:
                    overall
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to submit evaluation",
                error
            );
        }
    }
);

app.get(
    "/api/evaluations/student/:studentId",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        se.*,
                        rp.project_title
                     FROM student_evaluations se
                     JOIN research_projects rp
                       ON rp.project_id =
                          se.project_id
                     WHERE
                        se.student_id = ?
                     ORDER BY
                        se.evaluated_at DESC`,
                    [req.params.studentId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch student evaluations",
                error
            );
        }
    }
);

app.get(
    "/api/evaluations/project/:projectId",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        se.*,
                        s.register_number,
                        u.full_name AS student_name
                     FROM student_evaluations se
                     JOIN students s
                       ON s.student_id =
                          se.student_id
                     JOIN users u
                       ON u.user_id =
                          s.user_id
                     WHERE
                        se.project_id = ?
                     ORDER BY
                        se.evaluated_at DESC`,
                    [req.params.projectId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch project evaluations",
                error
            );
        }
    }
);

app.get(
    "/api/evaluations/faculty/:facultyId",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT
                        se.*,
                        rp.project_title,
                        s.register_number,
                        u.full_name AS student_name
                     FROM student_evaluations se
                     JOIN research_projects rp
                       ON rp.project_id =
                          se.project_id
                     JOIN students s
                       ON s.student_id =
                          se.student_id
                     JOIN users u
                       ON u.user_id =
                          s.user_id
                     WHERE
                        se.faculty_id = ?
                     ORDER BY
                        se.evaluated_at DESC`,
                    [req.params.facultyId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch faculty evaluations",
                error
            );
        }
    }
);

app.put(
    "/api/evaluations/:id",
    async (req, res) => {
        const {
            technical_skills_score,
            contribution_score,
            teamwork_score,
            communication_score,
            feedback
        } = req.body;

        const scores =
            [
                technical_skills_score,
                contribution_score,
                teamwork_score,
                communication_score
            ].map(
                (x) =>
                    clamp(
                        x,
                        0,
                        10,
                        0
                    )
            );

        const overall =
            Number(
                (
                    scores.reduce(
                        (
                            a,
                            b
                        ) =>
                            a + b,
                        0
                    ) / 4
                ).toFixed(
                    2
                )
            );

        try {
            const result =
                await queryDb(
                    `UPDATE student_evaluations SET
                        technical_skills_score = ?,
                        contribution_score = ?,
                        teamwork_score = ?,
                        communication_score = ?,
                        overall_score = ?,
                        feedback =
                            COALESCE(
                                ?,
                                feedback
                            )
                     WHERE evaluation_id = ?`,
                    [
                        scores[0],
                        scores[1],
                        scores[2],
                        scores[3],
                        overall,
                        feedback ||
                            null,
                        req.params.id
                    ]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Evaluation not found"
                });
            }

            res.json({
                message:
                    "Evaluation updated",
                overall_score:
                    overall
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to update evaluation",
                error
            );
        }
    }
);

app.delete(
    "/api/evaluations/:id",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `DELETE FROM student_evaluations
                     WHERE evaluation_id = ?`,
                    [req.params.id]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Evaluation not found"
                });
            }

            res.json({
                message:
                    "Evaluation deleted"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to delete evaluation",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// NOTIFICATIONS
// ------------------------------------------------------------

app.post(
    "/api/notifications",
    async (req, res) => {
        const {
            user_id,
            title,
            message,
            notification_type
        } = req.body;

        if (
            !user_id ||
            !title ||
            !message
        ) {
            return res.status(
                400
            ).json({
                message:
                    "user_id, title and message are required"
            });
        }

        try {
            const type =
                await safeEnumValue(
                    "notifications",
                    "notification_type",
                    notification_type ||
                        "System",
                    null
                );

            const result =
                await queryDb(
                    `INSERT INTO notifications
                    (
                        user_id,
                        title,
                        message,
                        notification_type
                    )
                    VALUES (?, ?, ?, ?)`,
                    [
                        user_id,
                        title,
                        message,
                        type
                    ]
                );

            res.status(201).json({
                message:
                    "Notification created",
                notification_id:
                    result.insertId
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to create notification",
                error
            );
        }
    }
);

app.get(
    "/api/notifications/:userId",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT *
                     FROM notifications
                     WHERE user_id = ?
                     ORDER BY
                        created_at DESC
                     LIMIT 100`,
                    [req.params.userId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch notifications",
                error
            );
        }
    }
);

app.get(
    "/api/users/:userId/notifications",
    async (req, res) => {
        try {
            res.json(
                await queryDb(
                    `SELECT *
                     FROM notifications
                     WHERE user_id = ?
                     ORDER BY
                        created_at DESC
                     LIMIT 100`,
                    [req.params.userId]
                )
            );
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch notifications",
                error
            );
        }
    }
);

app.put(
    "/api/notifications/:id/read",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `UPDATE notifications
                     SET is_read = 1
                     WHERE notification_id = ?`,
                    [req.params.id]
                );

            if (
                !result.affectedRows
            ) {
                return res.status(
                    404
                ).json({
                    message:
                        "Notification not found"
                });
            }

            res.json({
                message:
                    "Notification marked as read"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to mark notification as read",
                error
            );
        }
    }
);

app.put(
    "/api/notifications/user/:userId/read-all",
    async (req, res) => {
        try {
            const result =
                await queryDb(
                    `UPDATE notifications
                     SET is_read = 1
                     WHERE user_id = ?`,
                    [req.params.userId]
                );

            res.json({
                message:
                    "All notifications marked as read",
                updated:
                    result.affectedRows
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to mark notifications as read",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// STUDENT PROFILE
// ------------------------------------------------------------

app.get(
    "/api/student-profiles/:studentId",
    async (req, res) => {
        try {
            let rows =
                await queryDb(
                    `SELECT *
                     FROM student_profiles
                     WHERE student_id = ?
                     LIMIT 1`,
                    [req.params.studentId]
                );

            // Auto-create profile if absent.
            if (!rows.length) {
                const student =
                    await getStudent(
                        req.params.studentId
                    );

                if (!student) {
                    return res.status(
                        404
                    ).json({
                        message:
                            "Student not found"
                    });
                }

                await queryDb(
                    `INSERT INTO student_profiles
                    (
                        student_id,
                        user_id,
                        registration_number,
                        semester,
                        cgpa,
                        skills,
                        interests,
                        bio
                    )
                    VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL)`,
                    [
                        student.student_id,
                        student.user_id,
                        student.register_number,
                        student.semester,
                        student.cgpa
                    ]
                );

                rows =
                    await queryDb(
                        `SELECT *
                         FROM student_profiles
                         WHERE student_id = ?
                         LIMIT 1`,
                        [req.params.studentId]
                    );
            }

            res.json(rows[0]);
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch student profile",
                error
            );
        }
    }
);

app.put(
    "/api/student-profiles/:studentId",
    async (req, res) => {
        const {
            registration_number,
            semester,
            cgpa,
            skills,
            interests,
            bio
        } = req.body;

        try {
            const existing =
                await queryDb(
                    `SELECT
                        student_id
                     FROM student_profiles
                     WHERE student_id = ?
                     LIMIT 1`,
                    [req.params.studentId]
                );

            if (!existing.length) {
                const student =
                    await getStudent(
                        req.params.studentId
                    );

                if (!student) {
                    return res.status(
                        404
                    ).json({
                        message:
                            "Student not found"
                    });
                }

                await queryDb(
                    `INSERT INTO student_profiles
                    (
                        student_id,
                        user_id,
                        registration_number,
                        semester,
                        cgpa,
                        skills,
                        interests,
                        bio
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        student.student_id,
                        student.user_id,
                        registration_number ||
                            student.register_number,
                        semester ??
                            student.semester,
                        cgpa ??
                            student.cgpa,
                        skills ||
                            null,
                        interests ||
                            null,
                        bio ||
                            null
                    ]
                );
            } else {
                await queryDb(
                    `UPDATE student_profiles SET
                        registration_number =
                            COALESCE(
                                ?,
                                registration_number
                            ),
                        semester =
                            COALESCE(
                                ?,
                                semester
                            ),
                        cgpa =
                            COALESCE(
                                ?,
                                cgpa
                            ),
                        skills =
                            COALESCE(
                                ?,
                                skills
                            ),
                        interests =
                            COALESCE(
                                ?,
                                interests
                            ),
                        bio =
                            COALESCE(
                                ?,
                                bio
                            )
                     WHERE student_id = ?`,
                    [
                        registration_number,
                        semester,
                        cgpa,
                        skills,
                        interests,
                        bio,
                        req.params.studentId
                    ]
                );
            }

            // Keep main Student table synchronized.
            await queryDb(
                `UPDATE students SET
                    register_number =
                        COALESCE(
                            ?,
                            register_number
                        ),
                    semester =
                        COALESCE(
                            ?,
                            semester
                        ),
                    cgpa =
                        COALESCE(
                            ?,
                            cgpa
                        )
                 WHERE student_id = ?`,
                [
                    registration_number,
                    semester,
                    cgpa,
                    req.params.studentId
                ]
            );

            res.json({
                message:
                    "Student profile updated"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to update student profile",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// FACULTY PROFILE
// ------------------------------------------------------------

app.get(
    "/api/faculty-profiles/:facultyId",
    async (req, res) => {
        try {
            let rows =
                await queryDb(
                    `SELECT *
                     FROM faculty_profiles
                     WHERE faculty_id = ?
                     LIMIT 1`,
                    [req.params.facultyId]
                );

            if (!rows.length) {
                const faculty =
                    await getFaculty(
                        req.params.facultyId
                    );

                if (!faculty) {
                    return res.status(
                        404
                    ).json({
                        message:
                            "Faculty not found"
                    });
                }

                await queryDb(
                    `INSERT INTO faculty_profiles
                    (
                        faculty_id,
                        user_id,
                        employee_id,
                        designation,
                        specialization
                    )
                    VALUES (?, ?, ?, ?, ?)`,
                    [
                        faculty.faculty_id,
                        faculty.user_id,
                        faculty.employee_id,
                        faculty.designation,
                        faculty.specialization
                    ]
                );

                rows =
                    await queryDb(
                        `SELECT *
                         FROM faculty_profiles
                         WHERE faculty_id = ?
                         LIMIT 1`,
                        [req.params.facultyId]
                    );
            }

            res.json(rows[0]);
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to fetch faculty profile",
                error
            );
        }
    }
);

app.put(
    "/api/faculty-profiles/:facultyId",
    async (req, res) => {
        const {
            employee_id,
            designation,
            specialization
        } = req.body;

        try {
            const existing =
                await queryDb(
                    `SELECT
                        faculty_id
                     FROM faculty_profiles
                     WHERE faculty_id = ?
                     LIMIT 1`,
                    [req.params.facultyId]
                );

            if (!existing.length) {
                const faculty =
                    await getFaculty(
                        req.params.facultyId
                    );

                if (!faculty) {
                    return res.status(
                        404
                    ).json({
                        message:
                            "Faculty not found"
                    });
                }

                await queryDb(
                    `INSERT INTO faculty_profiles
                    (
                        faculty_id,
                        user_id,
                        employee_id,
                        designation,
                        specialization
                    )
                    VALUES (?, ?, ?, ?, ?)`,
                    [
                        faculty.faculty_id,
                        faculty.user_id,
                        employee_id ||
                            faculty.employee_id,
                        designation ||
                            faculty.designation,
                        specialization ||
                            faculty.specialization
                    ]
                );
            } else {
                await queryDb(
                    `UPDATE faculty_profiles SET
                        employee_id =
                            COALESCE(
                                ?,
                                employee_id
                            ),
                        designation =
                            COALESCE(
                                ?,
                                designation
                            ),
                        specialization =
                            COALESCE(
                                ?,
                                specialization
                            )
                     WHERE faculty_id = ?`,
                    [
                        employee_id,
                        designation,
                        specialization,
                        req.params.facultyId
                    ]
                );
            }

            await queryDb(
                `UPDATE faculty SET
                    employee_id =
                        COALESCE(
                            ?,
                            employee_id
                        ),
                    designation =
                        COALESCE(
                            ?,
                            designation
                        ),
                    specialization =
                        COALESCE(
                            ?,
                            specialization
                        )
                 WHERE faculty_id = ?`,
                [
                    employee_id,
                    designation,
                    specialization,
                    req.params.facultyId
                ]
            );

            res.json({
                message:
                    "Faculty profile updated"
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to update faculty profile",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// STUDENT DASHBOARD
// ------------------------------------------------------------

app.get(
    "/api/dashboard/student/:studentId",
    async (req, res) => {
        try {
            const studentRows =
                await queryDb(
                    `SELECT
                        s.*,
                        u.full_name,
                        u.email,
                        u.user_id,
                        u.department_id
                     FROM students s
                     JOIN users u
                       ON u.user_id =
                          s.user_id
                     WHERE
                        s.student_id = ?
                     LIMIT 1`,
                    [req.params.studentId]
                );

            if (!studentRows.length) {
                return res.status(
                    404
                ).json({
                    message:
                        "Student not found"
                });
            }

            const student =
                studentRows[0];

            const [
                applications,
                preferences,
                teams,
                evaluations,
                notifications,
                tasks
            ] =
                await Promise.all([
                    queryDb(
                        `SELECT
                            pa.*,
                            rp.project_title
                         FROM project_applications pa
                         JOIN research_projects rp
                           ON rp.project_id =
                              pa.project_id
                         WHERE
                            pa.student_id = ?
                         ORDER BY
                            pa.application_date DESC`,
                        [
                            req.params.studentId
                        ]
                    ),

                    queryDb(
                        `SELECT
                            pp.*,
                            rp.project_title
                         FROM project_preferences pp
                         JOIN research_projects rp
                           ON rp.project_id =
                              pp.project_id
                         WHERE
                            pp.student_id = ?
                         ORDER BY
                            pp.preference_rank`,
                        [
                            req.params.studentId
                        ]
                    ),

                    queryDb(
                        `SELECT
                            pt.*,
                            tm.member_role,
                            rp.project_title
                         FROM team_members tm
                         JOIN project_teams pt
                           ON pt.team_id =
                              tm.team_id
                         JOIN research_projects rp
                           ON rp.project_id =
                              pt.project_id
                         WHERE
                            tm.student_id = ?`,
                        [
                            req.params.studentId
                        ]
                    ),

                    queryDb(
                        `SELECT
                            se.*,
                            rp.project_title
                         FROM student_evaluations se
                         JOIN research_projects rp
                           ON rp.project_id =
                              se.project_id
                         WHERE
                            se.student_id = ?
                         ORDER BY
                            se.evaluated_at DESC`,
                        [
                            req.params.studentId
                        ]
                    ),

                    queryDb(
                        `SELECT *
                         FROM notifications
                         WHERE
                            user_id = ?
                         ORDER BY
                            created_at DESC
                         LIMIT 30`,
                        [
                            student.user_id
                        ]
                    ),

                    queryDb(
                        `SELECT
                            t.*,
                            m.milestone_title,
                            rp.project_title
                         FROM tasks t
                         JOIN milestones m
                           ON m.milestone_id =
                              t.milestone_id
                         JOIN research_projects rp
                           ON rp.project_id =
                              m.project_id
                         WHERE
                            t.assigned_to = ?
                         ORDER BY
                            t.due_date,
                            t.task_id`,
                        [
                            req.params.studentId
                        ]
                    )
                ]);

            res.json({
                student,
                applications,
                preferences,
                teams,
                evaluations,
                notifications,
                tasks
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to load student dashboard",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// FACULTY DASHBOARD
// ------------------------------------------------------------

app.get(
    "/api/dashboard/faculty/:facultyId",
    async (req, res) => {
        try {
            const facultyRows =
                await queryDb(
                    `SELECT
                        f.*,
                        u.full_name,
                        u.email,
                        u.user_id,
                        u.department_id
                     FROM faculty f
                     JOIN users u
                       ON u.user_id =
                          f.user_id
                     WHERE
                        f.faculty_id = ?
                     LIMIT 1`,
                    [req.params.facultyId]
                );

            if (!facultyRows.length) {
                return res.status(
                    404
                ).json({
                    message:
                        "Faculty not found"
                });
            }

            const faculty =
                facultyRows[0];

            const [
                projects,
                applications,
                evaluations,
                notifications,
                issues,
                risks,
                resources
            ] =
                await Promise.all([
                    queryDb(
                        `SELECT *
                         FROM research_projects
                         WHERE
                            faculty_id = ?
                         ORDER BY
                            created_at DESC`,
                        [
                            req.params.facultyId
                        ]
                    ),

                    queryDb(
                        `SELECT
                            pa.*,
                            rp.project_title,
                            s.register_number,
                            u.full_name AS student_name
                         FROM project_applications pa
                         JOIN research_projects rp
                           ON rp.project_id =
                              pa.project_id
                         JOIN students s
                           ON s.student_id =
                              pa.student_id
                         JOIN users u
                           ON u.user_id =
                              s.user_id
                         WHERE
                            rp.faculty_id = ?
                         ORDER BY
                            pa.application_date DESC`,
                        [
                            req.params.facultyId
                        ]
                    ),

                    queryDb(
                        `SELECT *
                         FROM student_evaluations
                         WHERE
                            faculty_id = ?
                         ORDER BY
                            evaluated_at DESC`,
                        [
                            req.params.facultyId
                        ]
                    ),

                    queryDb(
                        `SELECT *
                         FROM notifications
                         WHERE
                            user_id = ?
                         ORDER BY
                            created_at DESC
                         LIMIT 30`,
                        [
                            faculty.user_id
                        ]
                    ),

                    queryDb(
                        `SELECT i.*
                         FROM issues i
                         JOIN research_projects rp
                           ON rp.project_id =
                              i.project_id
                         WHERE
                            rp.faculty_id = ?
                         ORDER BY
                            i.reported_at DESC`,
                        [
                            req.params.facultyId
                        ]
                    ),

                    queryDb(
                        `SELECT r.*
                         FROM risks r
                         JOIN research_projects rp
                           ON rp.project_id =
                              r.project_id
                         WHERE
                            rp.faculty_id = ?
                         ORDER BY
                            r.identified_at DESC`,
                        [
                            req.params.facultyId
                        ]
                    ),

                    queryDb(
                        `SELECT
                            rr.*,
                            r.resource_name
                         FROM resource_requests rr
                         JOIN research_projects rp
                           ON rp.project_id =
                              rr.project_id
                         JOIN resources r
                           ON r.resource_id =
                              rr.resource_id
                         WHERE
                            rp.faculty_id = ?
                         ORDER BY
                            rr.request_date DESC`,
                        [
                            req.params.facultyId
                        ]
                    )
                ]);

            res.json({
                faculty,
                projects,
                applications,
                evaluations,
                notifications,
                issues,
                risks,
                resource_requests:
                    resources
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to load faculty dashboard",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// ADMIN DASHBOARD
// ------------------------------------------------------------

app.get(
    "/api/dashboard/admin",
    async (req, res) => {
        try {
            const [
                users,
                students,
                faculty,
                projects,
                applications,
                teams,
                pending,
                issues,
                risks,
                resources
            ] =
                await Promise.all([
                    queryDb(
                        `SELECT COUNT(*) AS count
                         FROM users`
                    ),

                    queryDb(
                        `SELECT COUNT(*) AS count
                         FROM students`
                    ),

                    queryDb(
                        `SELECT COUNT(*) AS count
                         FROM faculty`
                    ),

                    queryDb(
                        `SELECT COUNT(*) AS count
                         FROM research_projects`
                    ),

                    queryDb(
                        `SELECT COUNT(*) AS count
                         FROM project_applications`
                    ),

                    queryDb(
                        `SELECT COUNT(*) AS count
                         FROM project_teams`
                    ),

                    queryDb(
                        `SELECT COUNT(*) AS count
                         FROM research_projects
                         WHERE status =
                            'Pending Approval'`
                    ),

                    queryDb(
                        `SELECT COUNT(*) AS count
                         FROM issues
                         WHERE status NOT IN
                            (
                                'Resolved',
                                'Closed'
                            )`
                    ),

                    queryDb(
                        `SELECT COUNT(*) AS count
                         FROM risks
                         WHERE status NOT IN
                            (
                                'Resolved',
                                'Closed'
                            )`
                    ),

                    queryDb(
                        `SELECT COUNT(*) AS count
                         FROM resource_requests
                         WHERE status =
                            'Pending'`
                    )
                ]);

            res.json({
                total_users:
                    users[0].count,

                total_students:
                    students[0].count,

                total_faculty:
                    faculty[0].count,

                total_projects:
                    projects[0].count,

                total_applications:
                    applications[0]
                        .count,

                total_teams:
                    teams[0].count,

                pending_project_approvals:
                    pending[0].count,

                open_issues:
                    issues[0].count,

                open_risks:
                    risks[0].count,

                pending_resource_requests:
                    resources[0].count
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to load admin dashboard",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// REPORTS / ANALYTICS
// ------------------------------------------------------------

app.get(
    "/api/reports/summary",
    async (req, res) => {
        try {
            const [
                projectStatus,
                applicationStatus,
                departments,
                completed,
                evaluation,
                taskStatus,
                issueSeverity,
                riskImpact
            ] =
                await Promise.all([
                    queryDb(
                        `SELECT
                            status,
                            COUNT(*) AS count
                         FROM research_projects
                         GROUP BY status`
                    ),

                    queryDb(
                        `SELECT
                            status,
                            COUNT(*) AS count
                         FROM project_applications
                         GROUP BY status`
                    ),

                    queryDb(
                        `SELECT
                            d.department_name,
                            COUNT(
                                rp.project_id
                            ) AS project_count
                         FROM departments d
                         LEFT JOIN research_projects rp
                           ON rp.department_id =
                              d.department_id
                         GROUP BY
                            d.department_id,
                            d.department_name
                         ORDER BY
                            project_count DESC`
                    ),

                    queryDb(
                        `SELECT
                            COUNT(*) AS completed_projects
                         FROM research_projects
                         WHERE status =
                            'Completed'`
                    ),

                    queryDb(
                        `SELECT
                            ROUND(
                                AVG(
                                    overall_score
                                ),
                                2
                            ) AS average_student_evaluation
                         FROM student_evaluations`
                    ),

                    queryDb(
                        `SELECT
                            status,
                            COUNT(*) AS count
                         FROM tasks
                         GROUP BY status`
                    ),

                    queryDb(
                        `SELECT
                            severity,
                            COUNT(*) AS count
                         FROM issues
                         GROUP BY severity`
                    ),

                    queryDb(
                        `SELECT
                            impact,
                            COUNT(*) AS count
                         FROM risks
                         GROUP BY impact`
                    )
                ]);

            res.json({
                projects_by_status:
                    projectStatus,

                applications_by_status:
                    applicationStatus,

                projects_by_department:
                    departments,

                completed_projects:
                    completed[0]
                        ?.completed_projects ||
                    0,

                average_student_evaluation:
                    evaluation[0]
                        ?.average_student_evaluation ||
                    0,

                tasks_by_status:
                    taskStatus,

                issues_by_severity:
                    issueSeverity,

                risks_by_impact:
                    riskImpact
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to generate report",
                error
            );
        }
    }
);

app.get(
    "/api/reports/projects/:projectId",
    async (req, res) => {
        try {
            const project =
                await getProject(
                    req.params.projectId
                );

            if (!project) {
                return res.status(
                    404
                ).json({
                    message:
                        "Project not found"
                });
            }

            const [
                teamCount,
                applicationCounts,
                milestoneCounts,
                taskCounts,
                progress,
                evaluations,
                issues,
                risks
            ] =
                await Promise.all([
                    queryDb(
                        `SELECT
                            COUNT(*) AS count
                         FROM project_teams
                         WHERE project_id = ?`,
                        [req.params.projectId]
                    ),

                    queryDb(
                        `SELECT
                            status,
                            COUNT(*) AS count
                         FROM project_applications
                         WHERE project_id = ?
                         GROUP BY status`,
                        [req.params.projectId]
                    ),

                    queryDb(
                        `SELECT
                            status,
                            COUNT(*) AS count
                         FROM milestones
                         WHERE project_id = ?
                         GROUP BY status`,
                        [req.params.projectId]
                    ),

                    queryDb(
                        `SELECT
                            t.status,
                            COUNT(*) AS count
                         FROM tasks t
                         JOIN milestones m
                           ON m.milestone_id =
                              t.milestone_id
                         WHERE
                            m.project_id = ?
                         GROUP BY
                            t.status`,
                        [req.params.projectId]
                    ),

                    queryDb(
                        `SELECT
                            COALESCE(
                                AVG(
                                    t.completion_percentage
                                ),
                                0
                            ) AS average_task_progress
                         FROM tasks t
                         JOIN milestones m
                           ON m.milestone_id =
                              t.milestone_id
                         WHERE
                            m.project_id = ?`,
                        [req.params.projectId]
                    ),

                    queryDb(
                        `SELECT
                            COUNT(*) AS count,
                            ROUND(
                                AVG(
                                    overall_score
                                ),
                                2
                            ) AS average_score
                         FROM student_evaluations
                         WHERE
                            project_id = ?`,
                        [req.params.projectId]
                    ),

                    queryDb(
                        `SELECT
                            status,
                            COUNT(*) AS count
                         FROM issues
                         WHERE
                            project_id = ?
                         GROUP BY
                            status`,
                        [req.params.projectId]
                    ),

                    queryDb(
                        `SELECT
                            status,
                            COUNT(*) AS count
                         FROM risks
                         WHERE
                            project_id = ?
                         GROUP BY
                            status`,
                        [req.params.projectId]
                    )
                ]);

            res.json({
                project,

                team_count:
                    teamCount[0].count,

                applications:
                    applicationCounts,

                milestones:
                    milestoneCounts,

                tasks:
                    taskCounts,

                average_task_progress:
                    Number(
                        progress[0]
                            .average_task_progress ||
                            0
                    ),

                evaluations:
                    evaluations[0],

                issues,

                risks
            });
        } catch (error) {
            sendError(
                res,
                500,
                "Failed to generate project report",
                error
            );
        }
    }
);

// ------------------------------------------------------------
// API 404
// ------------------------------------------------------------

app.use(
    "/api",
    (req, res) => {
        res.status(404).json({
            message:
                "API route not found",
            method:
                req.method,
            path:
                req.originalUrl
        });
    }
);

// ------------------------------------------------------------
// GLOBAL ERROR HANDLER
// ------------------------------------------------------------

app.use(
    (
        error,
        req,
        res,
        next
    ) => {
        console.error(
            "Unhandled server error:",
            error
        );

        if (
            res.headersSent
        ) {
            return next(
                error
            );
        }

        res.status(500).json({
            message:
                "Internal server error",
            error:
                error.message
        });
    }
);

// ------------------------------------------------------------
// START SERVER
// ------------------------------------------------------------

app.listen(
    PORT,
    () => {
        console.log(
            `ResearchHub Backend running on port ${PORT}`
        );
    }
);