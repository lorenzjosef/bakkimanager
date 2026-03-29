from odoo import fields, models


class BakkiInventoryTransaction(models.Model):
    _name = 'bakki.inventory_transaction'
    _description = 'Bakki inventory transaction'
    _order = 'created_at desc, id desc'

    species_id = fields.Many2one('bakki.species', string='Species', required=True, ondelete='restrict', index=True)
    phase_id = fields.Many2one('bakki.planting_phase', string='Planting Phase', ondelete='set null', index=True)
    task_id = fields.Many2one('project.task', string='Task', ondelete='set null', index=True)
    quantity_delta = fields.Float(string='Quantity Delta', required=True)
    quantity_after = fields.Float(string='Quantity After')
    reason = fields.Selection(
        selection=[
            ('planting', 'Planting'),
            ('monitoring', 'Monitoring'),
            ('fertilizing', 'Fertilizing'),
            ('adjustment', 'Adjustment'),
            ('correction', 'Correction'),
        ],
        string='Reason',
        required=True,
        default='adjustment',
        index=True,
    )
    note = fields.Text(string='Note')
    created_at = fields.Datetime(string='Created At', default=fields.Datetime.now, required=True, index=True)
