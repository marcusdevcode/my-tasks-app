import { useState, useEffect } from 'react';
import {
    Table,
    Button,
    DateRangePicker,
    Modal,
    Form,
    Panel,
    Stack,
    Tag,
    IconButton,
    InputGroup,
    Avatar,
    SelectPicker,
    Container,
    Sidebar,
    Sidenav,
    Nav
} from 'rsuite';
import { startOfWeek, endOfWeek, format, parseISO, isWithinInterval } from 'date-fns';
import { useTaskStore } from './store/useTaskStore';

// Rich Text Editor
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// Icons
import PlusIcon from '@rsuite/icons/Plus';
import EditIcon from '@rsuite/icons/Edit';
import AttachmentIcon from '@rsuite/icons/Attachment';
import TaskIcon from '@rsuite/icons/Task';
import CheckIcon from '@rsuite/icons/Check';
import TimeIcon from '@rsuite/icons/Time';
import TrashIcon from '@rsuite/icons/Trash';
import ProjectIcon from '@rsuite/icons/Project';
import DashboardIcon from '@rsuite/icons/Dashboard';

import 'rsuite/dist/rsuite.min.css';

export default function App() {
    const { tasks, setTasks } = useTaskStore();
    const [projects, setProjects] = useState<any[]>([]);
    const [activeProject, setActiveProject] = useState<number | 'all'>('all');

    const [open, setOpen] = useState(false);
    const [projectModal, setProjectModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [range, setRange] = useState<[Date, Date]>([startOfWeek(new Date()), endOfWeek(new Date())]);

    const initialFormState = { title: '', description: '', image_path: '', status: 'pending', project_id: activeProject != null ? activeProject : null as number | null };
    const [formValue, setFormValue] = useState(initialFormState);
    const [projectForm, setProjectForm] = useState({ name: '' });

    const statusData = [
        { label: 'Pending', value: 'pending' },
        { label: 'Completed', value: 'completed' }
    ];

    const loadData = async () => {
        const t = await window.api.getTasks();
        const p = await window.api.getProjects();
        setTasks(t || []);
        setProjects(p || []);
    };

    useEffect(() => { loadData(); }, []);

    const [slug, setSlug] = useState<string>("all");
    const filteredTasks = tasks.filter(t => activeProject === 'all' || t.project_id === activeProject).filter(t => slug === 'all' ? true : t.status === slug);

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this task?')) {
            await window.api.deleteTask(id);
            loadData();
        }
    };

    const handleAddNew = () => {
        setEditingId(null);
        setFormValue(initialFormState);
        setOpen(true);
    };

    const handleEdit = (rowData: any) => {
        setEditingId(rowData.id);
        setFormValue({
            title: rowData.title,
            description: rowData.description,
            image_path: rowData.image_path,
            status: rowData.status,
            project_id: rowData.project_id
        });
        setOpen(true);
    };

    const handleStatClick = async (slug: string) => {
        setSlug(slug);
    }
    const handleToggleStatus = async (rowData: any) => {
        const isCompleting = rowData.status !== 'completed';
        const updatedTask = {
            ...rowData,
            status: isCompleting ? 'completed' : 'pending',
            completed_at: isCompleting ? new Date().toISOString() : null
        };
        await window.api.updateTask(updatedTask);
        loadData();
    };

    const handleSave = async () => {
        if (!formValue.title) return;
        if (editingId) {
            const completed_at = formValue.status === 'completed' ? new Date().toISOString() : null;
            await window.api.updateTask({ ...formValue, id: editingId, completed_at });
        } else {
            await window.api.addTask({ ...formValue, created_at: new Date().toISOString() });
        }
        setOpen(false);
        loadData();
    };

    const handleAddProject = async () => {
        if (!projectForm.name) return;
        await window.api.addProject(projectForm);
        setProjectModal(false);
        setProjectForm({ name: '' });
        loadData();
    };

    const handleDeleteProject = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (confirm('Delete project? Tasks will be unassigned.')) {
            await window.api.deleteProject(id);
            if (activeProject === id) setActiveProject('all');
            loadData();
        }
    };

    const handleUpload = async () => {
        const path = await window.api.selectFile();
        if (path) setFormValue({ ...formValue, image_path: path });
    };

    const exportToCSV = () => {
        const [startDate, endDate] = range;
        const filtered = tasks.filter(t => activeProject === 'all' || t.project_id === activeProject).filter(t => {
            if (t.status !== 'completed' || !t.completed_at) return false;
            try {
                const completedDate = parseISO(t.completed_at);
                return isWithinInterval(completedDate, { start: startDate, end: endDate });
            } catch (e) {
                return false;
            }
        });

        if (filtered.length === 0) {
            alert(`No completed tasks found in range.`);
            return;
        }

        const headers = "Task Name,Project Name,Status,Date Completed\n";
        const rows = filtered
            .map(t => `"${t.title}","${projects.find(p => p.id === t.project_id)?.name || 'Unknown'}","${t.status}","${t.completed_at}"`)
            .join("\n");

        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `completed-tasks-${format(startDate, 'MM-dd')}.csv`;
        a.click();
    };
    const tasksByProject = tasks.filter(t => activeProject === 'all' || t.project_id === activeProject);
    const stats = [
        { label: 'Total Tasks', value: tasksByProject.length, icon: <TaskIcon />, color: '#3498ff', slug: 'all' },
        { label: 'Completed', value: tasksByProject.filter(t => t.status === 'completed').length, icon: <CheckIcon />, color: '#4caf50', slug: 'completed' },
        { label: 'Pending', value: tasksByProject.filter(t => t.status === 'pending').length, icon: <TimeIcon />, color: '#ff9800', slug: 'pending' },
    ];

    const [editProjectModal, setEditProjectModal] = useState(false);
    const [editProjectForm, setEditProjectForm] = useState({ id: null as number | null, name: '' });

    const handleOpenEditProject = (e: React.MouseEvent, project: any) => {
        e.stopPropagation();
        setEditProjectForm({ id: project.id, name: project.name });
        setEditProjectModal(true);
    };

    const handleUpdateProject = async () => {
        if (!editProjectForm.name || !editProjectForm.id) return;
        await window.api.updateProject(editProjectForm);
        setEditProjectModal(false);
        loadData();
    };

    return (
        <Container style={{ height: '100vh', width: '100vw', background: '#f4f7f9', overflow: 'hidden' }}>
            <Sidebar style={{ display: 'flex', flexDirection: 'column', background: '#fff', borderRight: '1px solid #e5e5e5' }} width={260}>
                <Sidenav appearance="subtle" expanded={true}>
                    <Sidenav.Header style={{ padding: '20px', fontSize: '18px', fontWeight: 800, color: '#3498ff' }}>
                        PROJECT DASHBOARD
                    </Sidenav.Header>
                    <Sidenav.Body>
                        <Nav activeKey={activeProject}>
                            <Nav.Item eventKey="all" icon={<DashboardIcon />} onClick={() => setActiveProject('all')}>
                                All Tasks
                            </Nav.Item>

                            <Nav.Menu title="Projects" icon={<ProjectIcon />}  active>
                                {projects.map(p => (
                                    <Nav.Item key={p.id} eventKey={p.id} onClick={() => setActiveProject(p.id)}>
                                        <Stack justifyContent="space-between">
                                            <span>{p.name}</span>
                                            <Stack spacing={10}>
                                                <EditIcon
                                                    style={{ color: '#3498ff', cursor: 'pointer', fontSize: '12px' }}
                                                    onClick={(e) => handleOpenEditProject(e, p)}
                                                />
                                                <TrashIcon
                                                    style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: '12px' }}
                                                    onClick={(e) => handleDeleteProject(e, p.id)}
                                                />
                                            </Stack>
                                        </Stack>
                                    </Nav.Item>
                                ))}
                                <Nav.Item onClick={() => setProjectModal(true)} style={{ color: '#3498ff', fontWeight: 'bold' }}>
                                    <PlusIcon /> New Project
                                </Nav.Item>
                            </Nav.Menu>
                        </Nav>
                    </Sidenav.Body>
                </Sidenav>
            </Sidebar>

            <Container style={{ padding: '40px', overflowY: 'auto' }}>
                <Stack justifyContent="space-between" alignItems="center" style={{ marginBottom: 30 }}>
                    <header>
                        <h1 style={{ margin: 0, fontWeight: 800, color: '#1a1d23', fontSize: '28px' }}>
                            {activeProject === 'all' ? 'My tasks' : projects.find(p => p.id === activeProject)?.name + " tasks"}
                        </h1>
                        <p style={{ margin: 0, color: '#8e8e93' }}>Manage tasks and track productivity</p>
                    </header>
                    <Stack spacing={15}>
                        <DateRangePicker value={range} onChange={val => val && setRange(val)} style={{ width: 240 }} />
                        <Button appearance="ghost" onClick={exportToCSV}>Export Range (CSV)</Button>
                        <Button color="blue" appearance="primary" startIcon={<PlusIcon />} onClick={handleAddNew}>New Task</Button>
                    </Stack>
                </Stack>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                    {stats.map((stat, i) => (
                        <Panel bordered shaded key={i} style={{ background: (slug === stat.slug ? '#f9fffc' : '#fff'), borderRadius: 12,cursor: 'pointer', }} onClick={() => handleStatClick(stat.slug)}>
                            <Stack spacing={20}>
                                <Avatar size="lg" circle style={{ background: `${stat.color}15`, color: stat.color }}>{stat.icon}</Avatar>
                                <div>
                                    <div style={{ color: '#8e8e93', fontSize: '12px', fontWeight: 600 }}>{stat.label}</div>
                                    <div style={{ fontSize: '26px', fontWeight: 800 }}>{stat.value}</div>
                                </div>
                            </Stack>
                        </Panel>
                    ))}
                </div>

                <Panel bordered shaded header={<b style={{ fontSize: '16px' }}>Active Workflows</b>} style={{ background: '#fff', borderRadius: 12, overflow: 'auto' }}>
                    <Table data={filteredTasks} autoHeight hover={true} fillHeight={false}>
                        <Table.Column width={200} verticalAlign="middle">
                            <Table.HeaderCell style={{ background: '#f8fafc', fontWeight: 700 }}>Project NAME</Table.HeaderCell>
                            <Table.Cell dataKey="title" style={{ fontWeight: 600 }}>
                                {rowData => {
                                    const MainProject = projects.filter((project) => {
                                        return project.id == rowData.project_id;
                                    });
                                    return `${MainProject[0].name}`;
                                }}
                            </Table.Cell>
                        </Table.Column>
                        <Table.Column width={200} verticalAlign="middle">
                            <Table.HeaderCell style={{ background: '#f8fafc', fontWeight: 700 }}>TASK NAME</Table.HeaderCell>
                            <Table.Cell dataKey="title" style={{ fontWeight: 600 }}/>
                        </Table.Column>

                        <Table.Column flexGrow={1} verticalAlign="middle">
                            <Table.HeaderCell style={{ background: '#f8fafc', fontWeight: 700 }}>RESOURCES / DESCRIPTION</Table.HeaderCell>
                            <Table.Cell>
                                {rowData => (
                                    <Stack spacing={12}>
                                        {rowData.image_path ? (
                                            <img src={`local-resource://${rowData.image_path}`} style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <AttachmentIcon style={{ color: '#999' }} />
                                            </div>
                                        )}
                                        <div
                                            style={{ color: '#636e72', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                            dangerouslySetInnerHTML={{ __html: rowData.description }}
                                        />
                                    </Stack>
                                )}
                            </Table.Cell>
                        </Table.Column>

                        <Table.Column width={150} verticalAlign="middle" align="center">
                            <Table.HeaderCell style={{ background: '#f8fafc', fontWeight: 700 }}>STATUS</Table.HeaderCell>
                            <Table.Cell>
                                {rowData => (
                                    <Tag color={rowData.status === 'completed' ? 'green' : 'orange'} style={{ borderRadius: 20, cursor: 'pointer' }} onClick={() => handleToggleStatus(rowData)}>
                                        {rowData.status.toUpperCase()}
                                    </Tag>
                                )}
                            </Table.Cell>
                        </Table.Column>

                        <Table.Column width={150} fixed="right" verticalAlign="middle" align="center">
                            <Table.HeaderCell style={{ background: '#f8fafc', fontWeight: 700 }}>ACTIONS</Table.HeaderCell>
                            <Table.Cell>
                                {rowData => (
                                    <Stack spacing={6}>
                                        <IconButton size="sm" appearance="subtle" onClick={() => handleEdit(rowData)} icon={<EditIcon />} circle />
                                        <IconButton size="sm" color="red" appearance="subtle" onClick={() => handleDelete(rowData.id)} icon={<TrashIcon />} circle />
                                        <IconButton size="sm" color={rowData.status === 'completed' ? 'green' : 'blue'} appearance={rowData.status === 'completed' ? 'primary' : 'ghost'} onClick={() => handleToggleStatus(rowData)} icon={<CheckIcon />} circle />
                                    </Stack>
                                )}
                            </Table.Cell>
                        </Table.Column>
                    </Table>
                </Panel>
            </Container>

            <Modal open={projectModal} onClose={() => setProjectModal(false)} size="xs">
                <Modal.Header><Modal.Title>New Project</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form fluid formValue={projectForm} onChange={val => setProjectForm(val as any)}>
                        <Form.Group>
                            <Form.ControlLabel>Project Name</Form.ControlLabel>
                            <Form.Control name="name" />
                        </Form.Group>
                        <Button appearance="primary" onClick={handleAddProject} block>Create</Button>
                    </Form>
                </Modal.Body>
            </Modal>

            <Modal open={open} onClose={() => setOpen(false)} size="md">
                <Modal.Header><Modal.Title>{editingId ? 'Edit Task' : 'New Task'}</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form fluid formValue={formValue} onChange={val => setFormValue(val as any)}>
                        <Form.Group>
                            <Form.ControlLabel>Project</Form.ControlLabel>
                            <Form.Control
                                name="project_id"
                                accepter={SelectPicker}
                                value={formValue.project_id}
                                data={projects.map(p => ({ label: p.name, value: p.id }))}
                                block
                            />
                        </Form.Group>
                        <Form.Group><Form.ControlLabel>Title</Form.ControlLabel><Form.Control name="title" /></Form.Group>
                        <Form.Group>
                            <Form.ControlLabel>Description</Form.ControlLabel>
                            <div style={{ background: 'white' }}>
                                <ReactQuill
                                    theme="snow"
                                    value={formValue.description}
                                    onChange={(content) => setFormValue({ ...formValue, description: content })}
                                    style={{ height: '200px', marginBottom: '50px' }}
                                />
                            </div>
                        </Form.Group>
                        <Form.Group>
                            <Form.ControlLabel>Status</Form.ControlLabel>
                            <Form.Control name="status" accepter={SelectPicker} data={statusData} searchable={false} cleanable={false} block />
                        </Form.Group>
                        <Form.Group>
                            <Form.ControlLabel>Task Image</Form.ControlLabel>
                            <InputGroup>
                                <Form.Control name="image_path" value={formValue.image_path} readOnly />
                                <InputGroup.Button onClick={handleUpload}><AttachmentIcon /></InputGroup.Button>
                            </InputGroup>
                        </Form.Group>
                        <Button appearance="primary" onClick={handleSave} block style={{ marginTop: 20 }}>Confirm</Button>
                    </Form>
                </Modal.Body>
            </Modal>

            <Modal open={editProjectModal} onClose={() => setEditProjectModal(false)} size="xs">
                <Modal.Header>
                    <Modal.Title>Edit Project</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form fluid formValue={editProjectForm} onChange={val => setEditProjectForm(val as any)}>
                        <Form.Group>
                            <Form.ControlLabel>Project Name</Form.ControlLabel>
                            <Form.Control name="name" />
                        </Form.Group>
                        <Button appearance="primary" onClick={handleUpdateProject} block>
                            Update Project
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container>
    );
}