// ================================
// IMPORT REQUIRED PACKAGES
// ================================

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const mysql = require("mysql2");


// ================================
// LOAD ENVIRONMENT VARIABLES
// ================================

dotenv.config();


// ================================
// CREATE EXPRESS APPLICATION
// ================================

const app = express();


// ================================
// MIDDLEWARE
// ================================

app.use(cors());
app.use(express.json());


// ================================
// MONGODB CONNECTION
// ================================

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected Successfully");
    })
    .catch((error) => {
        console.error("MongoDB Connection Error:", error);
    });


// ================================
// MYSQL CONNECTION
// ================================

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((error) => {
    if (error) {
        console.error("MySQL Connection Error:", error);
        return;
    }

    console.log("MySQL Connected Successfully");
});


// ================================
// TEST ROUTE
// ================================

app.get("/", (req, res) => {
    res.json({
        message: "Research Project System Backend is Running!"
    });
});


// ================================
// GET ALL USERS
// ================================

app.get("/api/users", (req, res) => {

    const sql = `
        SELECT 
            user_id,
            full_name,
            email,
            role,
            department_id,
            created_at
        FROM users
    `;

    db.query(sql, (error, results) => {

        if (error) {
            console.error("Error fetching users:", error);

            return res.status(500).json({
                message: "Failed to fetch users"
            });
        }

        res.status(200).json(results);
    });
});


// ================================
// GET USER BY ID
// ================================

app.get("/api/users/:id", (req, res) => {

    const userId = req.params.id;

    const sql = `
        SELECT 
            user_id,
            full_name,
            email,
            role,
            department_id,
            created_at
        FROM users
        WHERE user_id = ?
    `;

    db.query(sql, [userId], (error, results) => {

        if (error) {
            console.error("Error fetching user:", error);

            return res.status(500).json({
                message: "Failed to fetch user"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json(results[0]);
    });
});


// ================================
// CREATE A NEW USER
// ================================

app.post("/api/users", (req, res) => {

    const {
        full_name,
        email,
        password,
        role,
        department_id
    } = req.body;


    // BASIC VALIDATION

    if (!full_name || !email || !password || !role) {

        return res.status(400).json({
            message: "Please provide full_name, email, password, and role"
        });
    }


    // INSERT USER INTO DATABASE

    const sql = `
        INSERT INTO users 
        (full_name, email, password, role, department_id)
        VALUES (?, ?, ?, ?, ?)
    `;


    db.query(
        sql,
        [
            full_name,
            email,
            password,
            role,
            department_id || null
        ],
        (error, result) => {

            if (error) {

                console.error("Error creating user:", error);

                return res.status(500).json({
                    message: "Failed to create user",
                    error: error.message
                });
            }


            // SUCCESS RESPONSE

            res.status(201).json({
                message: "User created successfully",

                user: {
                    user_id: result.insertId,
                    full_name: full_name,
                    email: email,
                    role: role,
                    department_id: department_id || null
                }
            });
        }
    );
});
// ================================
// USER LOGIN
// ================================

app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Please provide email and password"
        });
    }

    const sql = `
        SELECT
            user_id,
            full_name,
            email,
            password,
            role,
            department_id
        FROM users
        WHERE email = ?
    `;

    db.query(sql, [email], (error, results) => {

        if (error) {
            console.error("Login Error:", error);

            return res.status(500).json({
                message: "Login failed"
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = results[0];

        if (password !== user.password) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        res.status(200).json({
            message: "Login successful",
            user: {
                user_id: user.user_id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                department_id: user.department_id
            }
        });
    });
});
// ================================
// CREATE PROJECT PROPOSAL
// ================================

app.post("/api/projects", (req, res) => {

    const {
        faculty_id,
        department_id,
        project_title,
        project_description,
        minimum_cgpa,
        maximum_team_size,
        application_deadline
    } = req.body;

    // Basic validation
    if (
        !faculty_id ||
        !department_id ||
        !project_title ||
        !maximum_team_size
    ) {
        return res.status(400).json({
            message: "Please provide faculty_id, department_id, project_title, and maximum_team_size"
        });
    }

    const sql = `
        INSERT INTO research_projects
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
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending Approval')
    `;

    db.query(
        sql,
        [
            faculty_id,
            department_id,
            project_title,
            project_description || null,
            minimum_cgpa || null,
            maximum_team_size,
            application_deadline || null
        ],
        (error, result) => {

            if (error) {
                console.error("Error creating project:", error);

                return res.status(500).json({
                    message: "Failed to create project",
                    error: error.message
                });
            }

            res.status(201).json({
                message: "Project proposal created successfully",
                project: {
                    project_id: result.insertId,
                    faculty_id,
                    department_id,
                    project_title,
                    project_description: project_description || null,
                    minimum_cgpa: minimum_cgpa || null,
                    maximum_team_size,
                    application_deadline: application_deadline || null,
                    status: "Pending Approval"
                }
            });
        }
    );
});
// GET ALL PROJECTS
app.get("/api/projects", (req, res) => {
    const sql = `
        SELECT
            project_id,
            faculty_id,
            department_id,
            project_title,
            project_description,
            minimum_cgpa,
            maximum_team_size,
            application_deadline,
            status,
            created_at
        FROM research_projects
    `;

    db.query(sql, (error, results) => {
        if (error) {
            console.error("Error fetching projects:", error);

            return res.status(500).json({
                message: "Failed to fetch projects",
                error: error.message
            });
        }

        res.status(200).json(results);
    });
});
// GET PROJECT BY ID
app.get("/api/projects/:id", (req, res) => {
    const sql = `
        SELECT
            project_id,
            faculty_id,
            department_id,
            project_title,
            project_description,
            minimum_cgpa,
            maximum_team_size,
            application_deadline,
            status,
            created_at
        FROM research_projects
        WHERE project_id = ?
    `;

    db.query(sql, [req.params.id], (error, results) => {
        if (error) {
            return res.status(500).json({
                message: "Failed to fetch project",
                error: error.message
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        res.status(200).json(results[0]);
    });
});
// UPDATE PROJECT
app.put("/api/projects/:id", (req, res) => {
    const {
        project_title,
        project_description,
        minimum_cgpa,
        maximum_team_size,
        application_deadline
    } = req.body;

    const sql = `
        UPDATE research_projects
        SET
            project_title = ?,
            project_description = ?,
            minimum_cgpa = ?,
            maximum_team_size = ?,
            application_deadline = ?
        WHERE project_id = ?
    `;

    db.query(
        sql,
        [
            project_title,
            project_description,
            minimum_cgpa,
            maximum_team_size,
            application_deadline,
            req.params.id
        ],
        (error, result) => {
            if (error) {
                return res.status(500).json({
                    message: "Failed to update project",
                    error: error.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Project not found"
                });
            }

            res.status(200).json({
                message: "Project updated successfully"
            });
        }
    );
});
// DELETE PROJECT
app.delete("/api/projects/:id", (req, res) => {
    const sql = `
        DELETE FROM research_projects
        WHERE project_id = ?
    `;

    db.query(sql, [req.params.id], (error, result) => {
        if (error) {
            return res.status(500).json({
                message: "Failed to delete project",
                error: error.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        res.status(200).json({
            message: "Project deleted successfully"
        });
    });
});
// CREATE PROJECT APPLICATION
app.post("/api/applications", (req, res) => {
    const { student_id, project_id } = req.body;

    if (!student_id || !project_id) {
        return res.status(400).json({
            message: "Please provide student_id and project_id"
        });
    }

    const sql = `
        INSERT INTO project_applications
        (student_id, project_id)
        VALUES (?, ?)
    `;

    db.query(sql, [student_id, project_id], (error, result) => {
        if (error) {
            return res.status(500).json({
                message: "Failed to create application",
                error: error.message
            });
        }

        res.status(201).json({
            message: "Application submitted successfully",
            application_id: result.insertId
        });
    });
});
// GET ALL APPLICATIONS
app.get("/api/applications", (req, res) => {
    const sql = `
        SELECT
            application_id,
            student_id,
            project_id,
            application_date,
            status,
            remarks
        FROM project_applications
    `;

    db.query(sql, (error, results) => {
        if (error) {
            return res.status(500).json({
                message: "Failed to fetch applications",
                error: error.message
            });
        }

        res.status(200).json(results);
    });
});
// GET APPLICATION BY ID
app.get("/api/applications/:id", (req, res) => {
    const sql = `
        SELECT
            application_id,
            student_id,
            project_id,
            application_date,
            status,
            remarks
        FROM project_applications
        WHERE application_id = ?
    `;

    db.query(sql, [req.params.id], (error, results) => {
        if (error) {
            return res.status(500).json({
                message: "Failed to fetch application",
                error: error.message
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Application not found"
            });
        }

        res.status(200).json(results[0]);
    });
});
app.put("/api/applications/:id", (req, res) => {
    const applicationId = req.params.id;
    const { status, remarks } = req.body;

    const sql = `
        UPDATE project_applications
        SET status = ?, remarks = ?
        WHERE application_id = ?
    `;

    db.query(sql, [status, remarks, applicationId], (error) => {
        if (error) {
            console.error("Error updating application:", error);
            return res.status(500).json({
                message: "Failed to update application",
                error: error.message
            });
        }

        res.status(200).json({
            message: "Application updated successfully"
        });
    });
});
app.delete("/api/applications/:id", (req, res) => {
    const applicationId = req.params.id;

    const sql = `
        DELETE FROM project_applications
        WHERE application_id = ?
    `;

    db.query(sql, [applicationId], (error) => {
        if (error) {
            console.error("Error deleting application:", error);
            return res.status(500).json({
                message: "Failed to delete application",
                error: error.message
            });
        }

        res.status(200).json({
            message: "Application deleted successfully"
        });
    });
});

app.post("/api/departments", (req, res) => {
    const { department_name, department_code } = req.body;

    if (!department_name || !department_code) {
        return res.status(400).json({
            message: "Department name and code are required"
        });
    }

    const sql = `
        INSERT INTO departments (department_name, department_code)
        VALUES (?, ?)
    `;

    db.query(sql, [department_name, department_code], (error, result) => {
        if (error) {
            console.error("Error creating department:", error);
            return res.status(500).json({
                message: "Failed to create department",
                error: error.message
            });
        }

        res.status(201).json({
            message: "Department created successfully",
            department_id: result.insertId
        });
    });
});
app.put("/api/departments/:id", (req, res) => {
    const departmentId = req.params.id;
    const { department_name, department_code } = req.body;

    if (!department_name || !department_code) {
        return res.status(400).json({
            message: "Department name and code are required"
        });
    }

    const sql = `
        UPDATE departments
        SET department_name = ?, department_code = ?
        WHERE department_id = ?
    `;

    db.query(
        sql,
        [department_name, department_code, departmentId],
        (error, result) => {
            if (error) {
                console.error("Error updating department:", error);
                return res.status(500).json({
                    message: "Failed to update department",
                    error: error.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Department not found"
                });
            }

            res.status(200).json({
                message: "Department updated successfully"
            });
        }
    );
});
app.delete("/api/departments/:id", (req, res) => {
    const departmentId = req.params.id;

    const sql = `
        DELETE FROM departments
        WHERE department_id = ?
    `;

    db.query(sql, [departmentId], (error, result) => {
        if (error) {
            console.error("Error deleting department:", error);
            return res.status(500).json({
                message: "Failed to delete department",
                error: error.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Department not found"
            });
        }

        res.status(200).json({
            message: "Department deleted successfully"
        });
    });
});
app.get("/api/faculty", (req, res) => {
    const sql = "SELECT * FROM faculty";

    db.query(sql, (error, results) => {
        if (error) {
            console.error("Error fetching faculty:", error);
            return res.status(500).json({
                message: "Failed to fetch faculty",
                error: error.message
            });
        }

        res.status(200).json(results);
    });
});
app.get("/api/faculty/:id", (req, res) => {
    const facultyId = req.params.id;

    const sql = `
        SELECT *
        FROM faculty
        WHERE faculty_id = ?
    `;

    db.query(sql, [facultyId], (error, results) => {
        if (error) {
            console.error("Error fetching faculty:", error);
            return res.status(500).json({
                message: "Failed to fetch faculty",
                error: error.message
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Faculty not found"
            });
        }

        res.status(200).json(results[0]);
    });
});
app.post("/api/faculty", (req, res) => {
    const {
        user_id,
        employee_id,
        designation,
        specialization
    } = req.body;

    const sql = `
        INSERT INTO faculty
        (user_id, employee_id, designation, specialization)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [user_id, employee_id, designation, specialization],
        (error, result) => {
            if (error) {
                console.error("Error creating faculty:", error);

                return res.status(500).json({
                    message: "Failed to create faculty",
                    error: error.message
                });
            }

            res.status(201).json({
                message: "Faculty created successfully",
                faculty_id: result.insertId
            });
        }
    );
});
app.put("/api/faculty/:id", (req, res) => {
    const facultyId = req.params.id;

    const {
        designation,
        specialization
    } = req.body;

    const sql = `
        UPDATE faculty
        SET designation = ?, specialization = ?
        WHERE faculty_id = ?
    `;

    db.query(
        sql,
        [designation, specialization, facultyId],
        (error, result) => {
            if (error) {
                console.error("Error updating faculty:", error);

                return res.status(500).json({
                    message: "Failed to update faculty",
                    error: error.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Faculty not found"
                });
            }

            res.status(200).json({
                message: "Faculty updated successfully"
            });
        }
    );
});
app.delete("/api/faculty/:id", (req, res) => {
    const facultyId = req.params.id;

    const sql = `
        DELETE FROM faculty
        WHERE faculty_id = ?
    `;

    db.query(sql, [facultyId], (error, result) => {
        if (error) {
            console.error("Error deleting faculty:", error);

            return res.status(500).json({
                message: "Failed to delete faculty",
                error: error.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Faculty not found"
            });
        }

        res.status(200).json({
            message: "Faculty deleted successfully"
        });
    });
});
app.get("/api/students", (req, res) => {
    const sql = "SELECT * FROM students";

    db.query(sql, (error, results) => {
        if (error) {
            console.error("Error fetching students:", error);

            return res.status(500).json({
                message: "Failed to fetch students",
                error: error.message
            });
        }

        res.status(200).json(results);
    });
});
app.get("/api/students/:id", (req, res) => {
    const studentId = req.params.id;

    const sql = `
        SELECT *
        FROM students
        WHERE student_id = ?
    `;

    db.query(sql, [studentId], (error, results) => {
        if (error) {
            console.error("Error fetching student:", error);

            return res.status(500).json({
                message: "Failed to fetch student",
                error: error.message
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.status(200).json(results[0]);
    });
});
app.post("/api/students", (req, res) => {
    const {
        user_id,
        register_number,
        cgpa,
        semester,
        previous_project_experience
    } = req.body;

    const sql = `
        INSERT INTO students
        (user_id, register_number, cgpa, semester, previous_project_experience)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            user_id,
            register_number,
            cgpa,
            semester,
            previous_project_experience
        ],
        (error, result) => {
            if (error) {
                console.error("Error creating student:", error);

                return res.status(500).json({
                    message: "Failed to create student",
                    error: error.message
                });
            }

            res.status(201).json({
                message: "Student created successfully",
                student_id: result.insertId
            });
        }
    );
});
app.put("/api/students/:id", (req, res) => {
    const studentId = req.params.id;

    const {
        register_number,
        cgpa,
        semester,
        previous_project_experience
    } = req.body;

    const sql = `
        UPDATE students
        SET register_number = ?,
            cgpa = ?,
            semester = ?,
            previous_project_experience = ?
        WHERE student_id = ?
    `;

    db.query(
        sql,
        [
            register_number,
            cgpa,
            semester,
            previous_project_experience,
            studentId
        ],
        (error, result) => {
            if (error) {
                console.error("Error updating student:", error);

                return res.status(500).json({
                    message: "Failed to update student",
                    error: error.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Student not found"
                });
            }

            res.status(200).json({
                message: "Student updated successfully"
            });
        }
    );
});
app.delete("/api/students/:id", (req, res) => {
    const studentId = req.params.id;

    const sql = `
        DELETE FROM students
        WHERE student_id = ?
    `;

    db.query(sql, [studentId], (error, result) => {
        if (error) {
            console.error("Error deleting student:", error);

            return res.status(500).json({
                message: "Failed to delete student",
                error: error.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.status(200).json({
            message: "Student deleted successfully"
        });
    });
});


app.get("/api/departments", (req, res) => {
    const sql = "SELECT * FROM departments";

    db.query(sql, (error, results) => {
        if (error) {
            console.error("Error fetching departments:", error);
            return res.status(500).json({
                message: "Failed to fetch departments",
                error: error.message
            });
        }

        res.status(200).json(results);
    });
});
app.get("/api/departments/:id", (req, res) => {
    const departmentId = req.params.id;

    const sql = `
        SELECT *
        FROM departments
        WHERE department_id = ?
    `;

    db.query(sql, [departmentId], (error, results) => {
        if (error) {
            console.error("Error fetching department:", error);
            return res.status(500).json({
                message: "Failed to fetch department",
                error: error.message
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Department not found"
            });
        }

        res.status(200).json(results[0]);
    });
});


// ================================
// SERVER
// ================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});