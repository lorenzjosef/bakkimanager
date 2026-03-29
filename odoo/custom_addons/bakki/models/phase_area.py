from odoo import fields, models


class BakkiPhaseArea(models.Model):
    _name = 'bakki.phase_area'
    _description = 'Bakki phase area'
    _order = 'phase_id, sequence, area_id'

    phase_id = fields.Many2one('bakki.planting_phase', string='Planting Phase', required=True, ondelete='cascade', index=True)
    area_id = fields.Many2one('bakki.area', string='Area', required=True, ondelete='cascade', index=True)
    assigned_user_profile_id = fields.Many2one(
        'bakki.user_profile',
        string='Assigned Planter',
        ondelete='set null',
        index=True,
    )
    contract_tree_goal = fields.Integer(string='Contract Tree Goal')
    target_density_per_100sqm = fields.Float(string='Target Density per 100 sqm')
    sequence = fields.Integer(string='Sequence', default=10)
    note = fields.Text(string='Note')
    active = fields.Boolean(string='Active', default=True)

    _sql_constraints = [
        ('bakki_phase_area_unique', 'unique(phase_id, area_id)', 'An area can only be linked once to a planting phase.'),
    ]
